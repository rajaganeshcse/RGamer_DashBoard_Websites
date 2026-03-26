import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../Firebase";

export default function Redeem() {

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voucherInput, setVoucherInput] = useState({});

  useEffect(() => {

    const q = query(
      collection(db, "redeem_requests"),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {

        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRequests(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (id, status, type) => {

    const voucher = voucherInput[id]?.trim();

    // ❌ Voucher required for voucher types
    if (
      status === "success" &&
      type !== "upi" &&
      type !== "bank" &&
      !voucher
    ) {
      alert("Please enter voucher code before approving");
      return;
    }

    try {
      const data = {
        status: status,
        updated_at: Date.now()
      };

      // ✅ Auto attach voucher when approving
      if (
        status === "success" &&
        type !== "upi" &&
        type !== "bank"
      ) {
        data.voucher_code = voucher;
        data.voucher_added_at = Date.now();
      }

      await updateDoc(doc(db, "redeem_requests", id), data);

    } catch (err) {
      alert("Status update failed");
      console.error(err);
    }
  };

  /* ================= SAVE VOUCHER ONLY ================= */
  const saveVoucher = async (id) => {

    const voucher = voucherInput[id]?.trim();
    if (!voucher) {
      alert("Enter voucher code first");
      return;
    }

    try {
      await updateDoc(doc(db, "redeem_requests", id), {
        voucher_code: voucher,
        voucher_added_at: Date.now(),
      });
    } catch (err) {
      alert("Failed to save voucher");
      console.error(err);
    }
  };

  if (loading) return <h3>Loading redeem requests...</h3>;

  return (
    <div className="redeem">
      <h2>💸 Redeem Requests ({requests.length})</h2>

      {requests.length === 0 && <p>No redeem requests found.</p>}

      {requests.map((req) => {

        const currentVoucher =
          voucherInput[req.id] ?? req.voucher_code ?? "";

        const isVoucherType =
          req.type !== "upi" && req.type !== "bank";

        return (
          <div className="card" key={req.id}>

            <p><b>Name:</b> {req.username}</p>
            <p><b>Email:</b> {req.email}</p>

            <p><b>Coins:</b> 💰 {req.coins}</p>
            <p><b>Amount:</b> ₹{req.amount}</p>
            <p><b>Method:</b> {req.type}</p>

            {(req.type === "upi" || req.type === "bank") && (
              <p><b>UPI / Account:</b> {req.withdraw_details}</p>
            )}

            {/* STATUS */}
            <p>
              <b>Status:</b>{" "}
              <select
                value={req.status || "pending"}
                onChange={(e) =>
                  updateStatus(req.id, e.target.value, req.type)
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  fontWeight: "bold",
                  color:
                    req.status === "success"
                      ? "green"
                      : "orange",
                }}
              >
                <option value="pending">PENDING</option>
                <option value="success">SUCCESS</option>
              </select>
            </p>

            {/* VOUCHER INPUT (ONLY FOR VOUCHERS) */}
            {isVoucherType && (
              <p>
                <b>Voucher Code:</b>{" "}
                <input
                  type="text"
                  placeholder="Enter voucher code"
                  value={currentVoucher}
                  onChange={(e) =>
                    setVoucherInput({
                      ...voucherInput,
                      [req.id]: e.target.value,
                    })
                  }
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    marginRight: "8px",
                  }}
                />

                <button
                  onClick={() => saveVoucher(req.id)}
                  disabled={!currentVoucher.trim()}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: currentVoucher.trim()
                      ? "#4caf50"
                      : "#ccc",
                    color: "#fff",
                    cursor: currentVoucher.trim()
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  Save
                </button>
              </p>
            )}

            {/* SHOW SAVED */}
            {req.voucher_code && (
              <p>
                <b>Saved Voucher:</b> {req.voucher_code}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
