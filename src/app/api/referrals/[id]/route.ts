import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendReferralApprovedNotification, sendPaymentSentNotification, type PaymentPayload } from "@/lib/email";
import { getAdvisorTiers, calculateLessioCommission, calculateRewardForNextReferral, getAdvisorBubbleSettings, getBubblePointsForProduct, isEscaleraProduct, ESCALERA_PRODUCTS } from "@/lib/rewards";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const referral = await db.referral.findUnique({
    where: { id },
    include: {
      referrer: { select: { name: true } },
      advisor: { select: { name: true, email: true, plan: true } },
    },
  });
  if (!referral || referral.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const newStatus = body.status ?? referral.status;
  const newRewardStatus = body.rewardStatus ?? referral.rewardStatus;
  const r = referral as typeof referral & { saleAmount?: number | null; referrer: { name: string; email?: string | null } };
  const saleAmount = body.saleAmount != null ? Number(body.saleAmount) : r.saleAmount;
  const isPaid = newRewardStatus === "paid" && referral.rewardStatus !== "paid";
  const isConverting = newStatus === "converted" && referral.status !== "converted";
  const productTypeForConversion: string | null = body.productType !== undefined ? body.productType : referral.productType ?? null;

  // El nivel/premio se asigna por orden de CONVERSIÓN (no por orden de registro del lead):
  // al convertir, recalculamos tierPosition según cuántos referidos de este cliente ya convirtieron.
  // Solo Vida/PPR avanzan en la escalera 1,500/1,500/2,500. Daños/Auto y GMM van a premios
  // burbuja (no consumen un escalón), y "Otro" no genera premio en efectivo.
  const oldProductType = referral.productType ?? null;
  // El asesor puede corregir el producto contratado después de la conversión
  // (p. ej. marcó "Daños/Auto" pero en realidad fue "GMM") — pero no una vez pagado,
  // porque recalcular el nivel/premio ahí desincronizaría el monto real ya entregado.
  const isProductTypeEdit = referral.status === "converted" && !isConverting && referral.rewardStatus !== "paid"
    && body.productType !== undefined && body.productType !== oldProductType;

  let finalTierPosition = referral.tierPosition;
  let finalRewardAmount = referral.rewardAmount;
  let bubblePointsDelta = 0;
  // Si este referido ocupaba el nivel 1 (donde se aplica el Bono de Inicio) y se libera
  // sin haberse pagado, hay que devolver la elegibilidad del bono — si no, el cliente queda
  // bloqueado para siempre creyendo que ya lo usó, sin que ningún referido se lo haya quedado.
  let releaseLaunchBonus = false;
  // Si el lead se "desconvirtió" por error (p. ej. se marcó Contactado por accidente) y se
  // vuelve a convertir, ya tenía un nivel/premio asignado de antes — no se debe recalcular
  // desde cero, porque se perdería el Bono de Inicio (el flag launchBonusUsed ya está en
  // true y bloquearía que se vuelva a sumar al recomputar el monto base).
  const previouslyHadEscaleraSlot = referral.tierPosition > 0 && referral.rewardStatus !== "pending";
  if (isConverting) {
    if (isEscaleraProduct(productTypeForConversion)) {
      if (previouslyHadEscaleraSlot) {
        finalTierPosition = referral.tierPosition;
        finalRewardAmount = referral.rewardAmount;
      } else {
        const convertedCount = await db.referral.count({
          where: {
            referrerId: referral.referrerId,
            status: "converted",
            OR: [{ productType: { in: ESCALERA_PRODUCTS } }, { productType: null }],
          },
        });
        const { amount, tierPosition } = await calculateRewardForNextReferral(referral.advisorId, convertedCount);
        finalTierPosition = tierPosition;
        finalRewardAmount = amount;
      }
    } else {
      finalTierPosition = 0;
      finalRewardAmount = 0;
      if (previouslyHadEscaleraSlot && referral.rewardStatus !== "paid") releaseLaunchBonus = true;
    }
  } else if (isProductTypeEdit) {
    const newProductType = productTypeForConversion;
    const oldIsEscalera = isEscaleraProduct(oldProductType);
    const newIsEscalera = isEscaleraProduct(newProductType);
    const bubbleSettings = await getAdvisorBubbleSettings(referral.advisorId);

    if (oldIsEscalera && !newIsEscalera) {
      // Escalera -> burbuja: libera el escalón y suma puntos burbuja del nuevo producto
      finalTierPosition = 0;
      finalRewardAmount = 0;
      bubblePointsDelta += getBubblePointsForProduct(newProductType, bubbleSettings) ?? 0;
      if (referral.tierPosition === 1 && referral.rewardStatus !== "paid") releaseLaunchBonus = true;
    } else if (!oldIsEscalera && newIsEscalera) {
      // Burbuja -> escalera: asigna el siguiente escalón disponible y resta los puntos burbuja previos
      const convertedCount = await db.referral.count({
        where: {
          id: { not: referral.id },
          referrerId: referral.referrerId,
          status: "converted",
          OR: [{ productType: { in: ESCALERA_PRODUCTS } }, { productType: null }],
        },
      });
      const { amount, tierPosition } = await calculateRewardForNextReferral(referral.advisorId, convertedCount);
      finalTierPosition = tierPosition;
      finalRewardAmount = amount;
      bubblePointsDelta -= getBubblePointsForProduct(oldProductType, bubbleSettings) ?? 0;
    } else if (!oldIsEscalera && !newIsEscalera) {
      // Ambos burbuja (p. ej. Daños/Auto <-> GMM): ajusta la diferencia de puntos
      const oldPoints = getBubblePointsForProduct(oldProductType, bubbleSettings) ?? 0;
      const newPoints = getBubblePointsForProduct(newProductType, bubbleSettings) ?? 0;
      bubblePointsDelta += newPoints - oldPoints;
    }
    // Ambos escalera (Vida <-> PPR): tierPosition y rewardAmount no cambian.
  }

  // Comisión de Referidoo sobre el contrato: se recalcula tanto al convertir como
  // al corregir el producto/monto de un referido ya convertido (isProductTypeEdit) —
  // si no, quedaría con el valor del producto viejo después de una corrección.
  // null si el producto no tiene tasa definida o no hay saleAmount (nunca 0).
  const lessioCommission = (isConverting || isProductTypeEdit)
    ? calculateLessioCommission(productTypeForConversion, saleAmount, referral.advisor.plan)
    : undefined;

  // Check launch bonus (3+ referrals in first 7 days → bonus on first prize only)
  // Se recalcula en cada PATCH mientras el premio no se haya pagado, para que aplique
  // retroactivamente si el referente alcanza 3 referidos después de la conversión.
  let launchBonusApplied = false;
  if (finalTierPosition === 1 && referral.rewardStatus !== "paid") {
    const refClient = await db.client.findUnique({
      where: { id: referral.referrerId },
      select: { createdAt: true, launchBonusUsed: true },
    });
    if (refClient && !refClient.launchBonusUsed) {
      const windowEnd = new Date(refClient.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() <= windowEnd) {
        const countInWindow = await db.referral.count({
          where: { referrerId: referral.referrerId, createdAt: { lte: windowEnd } },
        });
        if (countInWindow >= 3) {
          finalRewardAmount = finalRewardAmount + 1000;
          launchBonusApplied = true;
        }
      }
    }
  }

  const updated = await db.referral.update({
    where: { id },
    data: {
      status: newStatus,
      rewardStatus: newRewardStatus,
      leadNotes: body.leadNotes ?? referral.leadNotes,
      saleAmount: saleAmount ?? undefined,
      // No se permite cambiar el producto de un referido ya convertido una vez pagado
      // (ver isProductTypeEdit arriba) — el monto/nivel ya entregado quedaría desincronizado.
      ...(body.productType !== undefined && !(referral.status === "converted" && referral.rewardStatus === "paid")
        ? { productType: body.productType } : {}),
      ...(body.interestProductType !== undefined ? { interestProductType: body.interestProductType } : {}),
      ...(finalTierPosition !== referral.tierPosition ? { tierPosition: finalTierPosition } : {}),
      ...(finalRewardAmount !== referral.rewardAmount ? { rewardAmount: finalRewardAmount } : {}),
      ...(isPaid ? { rewardPaidAt: new Date(), paymentNote: body.paymentNote ?? null } : {}),
      ...(lessioCommission !== undefined ? { lessioCommission } : {}),
    },
  });

  if (launchBonusApplied) {
    await db.client.update({ where: { id: referral.referrerId }, data: { launchBonusUsed: true } });
  } else if (releaseLaunchBonus) {
    await db.client.update({ where: { id: referral.referrerId }, data: { launchBonusUsed: false } });
  }

  if (bubblePointsDelta !== 0) {
    const referrerClient = await db.client.findUnique({ where: { id: referral.referrerId }, select: { bubblePoints: true } });
    const newBubblePoints = Math.max(0, (referrerClient?.bubblePoints ?? 0) + bubblePointsDelta);
    await db.client.update({ where: { id: referral.referrerId }, data: { bubblePoints: newBubblePoints } });
  }

  // 1. Notify creator when advisor marks referral as converted (deal closed)
  if (isConverting) {
    sendReferralApprovedNotification({
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      referrerName: r.referrer.name,
      leadName: referral.leadName,
      leadPhone: referral.leadPhone,
      leadEmail: referral.leadEmail,
      rewardAmount: finalRewardAmount,
      tierPosition: finalTierPosition,
      saleAmount: saleAmount ?? null,
      launchBonusApplied,
      productType: productTypeForConversion,
      lessioCommission,
    }).catch((err) => console.error("[email] Error enviando conversión:", err));

    // Premios burbuja: Auto y GMM acumulan a un mismo fondo reclamable
    const bubbleSettings = await getAdvisorBubbleSettings(referral.advisorId);
    const bubblePoints = getBubblePointsForProduct(productTypeForConversion, bubbleSettings);
    if (bubblePoints) {
      await db.client.update({
        where: { id: referral.referrerId },
        data: { bubblePoints: { increment: bubblePoints } },
      });
    }
  }

  // 2. Notify referrer (Ana) and creator when payment is sent
  if (isPaid) {
    const [client, tiers, settings] = await Promise.all([
      db.client.findUnique({ where: { id: referral.referrerId }, select: { accessToken: true, email: true, name: true } }),
      getAdvisorTiers(referral.advisorId),
      db.advisorSettings.findUnique({ where: { advisorId: referral.advisorId } }),
    ]);
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const portalUrl = `${base}/c/${client?.accessToken ?? ""}`;

    // Calculate next tier for incentive copy
    const nextPos = finalTierPosition + 1;
    const afterLastTier = settings?.afterLastTier ?? "cycle";
    let nextTierAmount: number | null = null;
    let nextTierPosition: number | null = null;
    if (tiers.length > 0 && afterLastTier !== "stop") {
      const exact = tiers.find((t) => t.position === nextPos);
      if (exact) {
        nextTierAmount = exact.amount;
        nextTierPosition = nextPos;
      } else if (afterLastTier === "cycle") {
        const cyclePos = ((nextPos - 1) % tiers.length) + 1;
        const cycleTier = tiers.find((t) => t.position === cyclePos);
        nextTierAmount = cycleTier?.amount ?? tiers[0].amount;
        nextTierPosition = nextPos;
      } else if (afterLastTier === "flat") {
        nextTierAmount = settings?.flatAmount ?? 1500;
        nextTierPosition = nextPos;
      }
    }

    const emailPayload: PaymentPayload = {
      referrerName: r.referrer.name,
      referrerEmail: client?.email ?? "",
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      leadName: referral.leadName,
      rewardAmount: finalRewardAmount,
      tierPosition: finalTierPosition,
      portalUrl,
      paymentNote: body.paymentNote ?? null,
      nextTierPosition,
      nextTierAmount,
    };

    // Schedule with 5-min delay via QStash if configured, otherwise send immediately
    const qstashToken = process.env.QSTASH_TOKEN;
    if (qstashToken && client?.email) {
      const webhookUrl = `${base}/api/webhooks/send-confirmation`;
      fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(webhookUrl)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          "Upstash-Delay": "300s",
          "Upstash-Forward-X-Webhook-Secret": process.env.CRON_SECRET ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      }).catch((err) => console.error("[qstash] Error agendando email:", err));
    } else {
      sendPaymentSentNotification(emailPayload).catch((err) => console.error("[email] Error enviando pago:", err));
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const referral = await db.referral.findUnique({ where: { id } });
  if (!referral || referral.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.referral.delete({ where: { id } });

  // Si se borra el referido que ocupaba el nivel 1 sin haberse pagado, libera el Bono de
  // Inicio para que un futuro referido pueda volver a calificar.
  if (referral.tierPosition === 1 && referral.rewardStatus !== "paid") {
    await db.client.update({ where: { id: referral.referrerId }, data: { launchBonusUsed: false } });
  }

  return NextResponse.json({ ok: true });
}
