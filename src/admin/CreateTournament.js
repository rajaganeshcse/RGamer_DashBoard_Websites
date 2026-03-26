import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../Firebase";
import "./CreateTournament.css";

export default function CreateTournament() {
  const [game, setGame] = useState("freefire");
  const [coin, setCoin] = useState("");              // ✅ changed
  const [totalSlots, setTotalSlots] = useState("");
  const [entryTickets, setEntryTickets] = useState("");
  const [freeAdEntry, setFreeAdEntry] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");

  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!coin || !totalSlots || (!freeAdEntry && !entryTickets)) {
      alert("Please fill all required fields");
      return;
    }

    // ✅ Convert match date + time to milliseconds
    let startTimeMillis = null;
    if (startDate && startTime) {
      startTimeMillis = new Date(`${startDate}T${startTime}`).getTime();
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "tournaments"), {
        game,
        status: "scheduled",

        // ✅ prize → coin
        coin: Number(coin),

        totalSlots: Number(totalSlots),
        joinedSlots: 0,
        entryTickets: freeAdEntry ? 0 : Number(entryTickets),
        freeAdEntry,
        startTimeMillis,
        roomId: roomId || null,
        roomPassword: roomPassword || null,
        createdByRole: "admin",

        // ✅ milliseconds timestamp
        created_at: Date.now()
      });

      alert("✅ Tournament created");

      // Reset form
      setCoin("");
      setTotalSlots("");
      setEntryTickets("");
      setFreeAdEntry(false);
      setStartDate("");
      setStartTime("");
      setRoomId("");
      setRoomPassword("");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-card">
      <h2 className="create-title">Create Tournament</h2>

      <div className="create-grid">
        {/* LEFT COLUMN */}
        <div>
          <Field label="Game">
            <select value={game} onChange={e => setGame(e.target.value)}>
              <option value="freefire">Free Fire</option>
              <option value="pubg">BGMI</option>
              <option value="ludo">Ludo</option>
              <option value="jackpot">Jackpot</option>
            </select>
          </Field>

          <Field label="Prize (Coins)">
            <input
              type="number"
              value={coin}
              onChange={e => setCoin(e.target.value)}
            />
          </Field>

          <Field label="Total Slots">
            <input
              type="number"
              value={totalSlots}
              onChange={e => setTotalSlots(e.target.value)}
            />
          </Field>

          <Field label="Entry Tickets">
            <input
              type="number"
              value={entryTickets}
              disabled={freeAdEntry}
              onChange={e => setEntryTickets(e.target.value)}
            />
          </Field>

          <div className="checkbox-row">
            <input
              type="checkbox"
              checked={freeAdEntry}
              onChange={e => setFreeAdEntry(e.target.checked)}
            />
            <span>Free Entry (Watch Ad)</span>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <Field label="Match Date">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </Field>

          <Field label="Match Time">
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </Field>

          <Field label="Room ID (optional)">
            <input
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
            />
          </Field>

          <Field label="Room Password (optional)">
            <input
              type="text"
              value={roomPassword}
              onChange={e => setRoomPassword(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <button
        className="create-btn"
        disabled={loading}
        onClick={create}
      >
        {loading ? "Creating..." : "Create Tournament"}
      </button>
    </div>
  );
}

/* ================= FIELD COMPONENT ================= */

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
