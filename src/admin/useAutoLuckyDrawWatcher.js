import { useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";
import { autoCompleteLuckyDraw } from "./autoCompleteLuckyDraw";

export function useAutoLuckyDrawWatcher() {

  useEffect(() => {

    const unsubscribe = onSnapshot(
      collection(db, "lucky_draws"),
      (snapshot) => {

        snapshot.docs.forEach(docSnap => {

          const draw = docSnap.data();

          if (
            draw.status === "OPEN" &&
            draw.filledSlots >= draw.totalSlots
          ) {
            // 🔥 AUTO COMPLETE DRAW
            autoCompleteLuckyDraw(docSnap.id)
              .catch(err =>
                console.error("Auto complete failed:", err)
              );
          }
        });
      }
    );

    return () => unsubscribe();

  }, []);
}
