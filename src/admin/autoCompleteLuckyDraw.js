import {
  doc,
  collection,
  getDocs,
  runTransaction,
  increment,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../Firebase";

export async function autoCompleteLuckyDraw(drawId) {

  const drawRef = doc(db, "lucky_draws", drawId);
  const entriesRef = collection(
    db,
    "lucky_draw_entries",
    drawId,
    "users"
  );

  await runTransaction(db, async (transaction) => {

    // 1️⃣ Read draw
    const drawSnap = await transaction.get(drawRef);
    if (!drawSnap.exists()) return;

    const draw = drawSnap.data();

    // 🛑 SAFETY CHECKS
    if (draw.status !== "OPEN") return;
    if (draw.filledSlots < draw.totalSlots) return;

    // 2️⃣ Read participants
    const entriesSnap = await getDocs(entriesRef);
    if (entriesSnap.empty) return;

    const userIds = entriesSnap.docs.map(d => d.id);

    // 3️⃣ Pick random winner
    const winnerUid =
      userIds[Math.floor(Math.random() * userIds.length)];

    const winnerRef = doc(db, "users", winnerUid);

    // 4️⃣ Mark draw completed
    transaction.update(drawRef, {
      status: "COMPLETED",
      winnerUid: winnerUid,
      completedAt: serverTimestamp()
    });

    // 5️⃣ 💰 AUTO CREDIT COINS (SAFE INCREMENT)
    transaction.set(
      winnerRef,
      {
        coins: increment(draw.rewardCoins),
        lastWinAt: serverTimestamp()
      },
      { merge: true }
    );
  });
}
