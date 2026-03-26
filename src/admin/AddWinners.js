import { setDoc, doc } from "firebase/firestore";
import { db } from "../components/Firebase";

export default function AddWinner({ tournamentId }) {

  const addWinner = async () => {
    await setDoc(
      doc(db, "tournaments", tournamentId, "winners", "1"),
      { uid: "USER_UID", prize: 50, rank: 1 }
    );
    alert("Winner added");
  };

  return <button onClick={addWinner}>Add Winner</button>;
}
