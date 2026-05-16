import { useState, useRef, useEffect } from "react";
import React from "react";

const NUMBERS = Array.from({ length: 14 }, (_, i) => i); // 0-13
const RED = [1,3,5,7,9,11,13];
const WHEEL_ORDER = [0,7,2,11,4,13,6,1,8,3,10,5,12,9]; // 0-13 wheel
const MAX_SELECTIONS = 3;

function getColor(n) {
  if (RED.includes(n)) return "red";
  return "black";
}

const MIN_BET = 5;
const PAYOUT = 10; // pay 30:1 (house keeps ~16%)

export default function BolitaMachine() {
  const [bets, setBets] = useState({}); // { number: amount }
  const [activeBet, setActiveBet] = useState(5);
  const [balance, setBalance] = useState(500);
  const [phase, setPhase] = useState("idle"); // idle | spinning | stopping | result
  const [angle, setAngle] = useState(0);
  const [ballPos, setBallPos] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ spins: 0, totalBet: 0, totalWon: 0 });
  const [winFlash, setWinFlash] = useState(false);

  const animRef = useRef(null);
  const wheelAngleRef = useRef(0);
  const ballAngleRef = useRef(180);
  const speedRef = useRef(0);
  const ballSpeedRef = useRef(0);
  const phaseRef = useRef("idle");
  const canvasRef = useRef(null);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
  const betCount = Object.keys(bets).length;

  const toggleBet = (num) => {
    if (phase !== "idle") return;
    setBets(prev => {
      const next = { ...prev };
      if (next[num]) {
        delete next[num];
      } else {
        if (Object.keys(next).length >= MAX_SELECTIONS) return prev;
        next[num] = activeBet;
      }
      return next;
    });
  };

  const changeBetAmount = (num, delta) => {
    if (phase !== "idle") return;
    setBets(prev => {
      const next = { ...prev };
      const current = next[num] || MIN_BET;
      const newVal = Math.max(MIN_BET, current + delta);
      next[num] = newVal;
      return next;
    });
  };

  const startSpin = () => {
    if (phase !== "idle" || totalBet === 0 || balance < totalBet) return;
    setBalance(b => b - totalBet);
    setResult(null);
    setWinFlash(false);
    phaseRef.current = "spinning";
    setPhase("spinning");
    speedRef.current = 3.5;
    ballSpeedRef.current = -8.5;

    const animate = () => {
      if (phaseRef.current !== "spinning" && phaseRef.current !== "stopping") return;
      wheelAngleRef.current = (wheelAngleRef.current + speedRef.current) % 360;
      ballAngleRef.current = (ballAngleRef.current + ballSpeedRef.current + 360) % 360;
      setAngle(wheelAngleRef.current);
      setBallPos(ballAngleRef.current);

      if (phaseRef.current === "stopping") {
        speedRef.current *= 0.983;
        ballSpeedRef.current *= 0.972;

        if (Math.abs(ballSpeedRef.current) < 0.12) {
          const relativeBall = ((ballAngleRef.current - wheelAngleRef.current) + 360) % 360;
          const sliceSize = 360 / WHEEL_ORDER.length;
          const idx = Math.floor(relativeBall / sliceSize) % WHEEL_ORDER.length;
          const landed = WHEEL_ORDER[idx];

          phaseRef.current = "result";
          setPhase("result");

          const betOnLanded = bets[landed] || 0;
          const payout = betOnLanded > 0 ? betOnLanded * PAYOUT : 0;
          const won = payout > 0;

          if (payout > 0) {
            setBalance(b => b + payout);
            setWinFlash(true);
            setTimeout(() => setWinFlash(false), 1500);
          }

          const newBalance = balance - totalBet + payout;
          setResult({ number: landed, won, payout, betOnLanded });
          setHistory(prev => [{ number: landed, won, totalBet, payout, balanceAfter: newBalance }, ...prev].slice(0, 20));
          setStats(prev => ({
            spins: prev.spins + 1,
            totalBet: prev.totalBet + totalBet,
            totalWon: prev.totalWon + payout,
          }));
          return;
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  };

  const stopSpin = () => {
    if (phaseRef.current !== "spinning") return;
    phaseRef.current = "stopping";
    setPhase("stopping");
  };

  const newRound = () => {
    setResult(null);
    setBets({});
    phaseRef.current = "idle";
    setPhase("idle");
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // Canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const cx = W / 2, cy = W / 2, r = W / 2 - 6;
    ctx.clearRect(0, 0, W, W);

    const sliceAngle = (2 * Math.PI) / WHEEL_ORDER.length;
    const startRad = (angle * Math.PI) / 180;

    WHEEL_ORDER.forEach((num, i) => {
      const start = startRad + i * sliceAngle;
      const end = start + sliceAngle;
      const isRed = RED.includes(num);
      const isBet = bets[num] !== undefined;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.fillStyle = isBet
        ? (isRed ? "#ff6600" : "#0055cc")
        : (isRed ? "#880000" : "#111111");
      ctx.fill();
      ctx.strokeStyle = "#c8a400";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Number
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.translate(r * 0.74, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = isBet ? "#ffe566" : "#ccc";
      ctx.font = `bold 9px Georgia`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(num, 0, 0);
      ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "#c8a400";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
    grad.addColorStop(0, "#333");
    grad.addColorStop(1, "#111");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#c8a400";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ball
    const ballRad = (ballPos * Math.PI) / 180;
    const ballR = r * 0.87;
    const bx = cx + ballR * Math.cos(ballRad);
    const by = cy + ballR * Math.sin(ballRad);
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, 2 * Math.PI);
    const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 7);
    ballGrad.addColorStop(0, "#ffffff");
    ballGrad.addColorStop(1, "#aaaaaa");
    ctx.fillStyle = ballGrad;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [angle, ballPos, bets]);

  const houseEdge = stats.totalBet > 0
    ? (((stats.totalBet - stats.totalWon) / stats.totalBet) * 100).toFixed(1)
    : "0.0";

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1a0800 0%, #050005 60%, #000 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px",
      gap: "12px",
      fontFamily: "'Georgia', serif",
      color: "#f5e6c8",
    }}>

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: "30px", fontWeight: "900", letterSpacing: "4px",
          background: "linear-gradient(90deg, #ff6600, #ffcc00, #ff6600)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 12px #ff660088)",
        }}>🎡 LA BOLITA</div>
        <div style={{ fontSize: "9px", letterSpacing: "4px", color: "#664400" }}>SELECCIONA • APUESTA • GANA</div>
      </div>

      {/* Balance + total bet */}
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{
          background: "#0d0500", border: "2px solid #c8a400",
          borderRadius: "10px", padding: "8px 20px", textAlign: "center",
          boxShadow: "0 0 16px #c8a40033",
        }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#664400" }}>CRÉDITOS</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: balance < 50 ? "#ff4444" : "#ffcc00" }}>
            ${balance}
          </div>
        </div>
        <div style={{
          background: "#0d0500", border: `2px solid ${totalBet > 0 ? "#ff6600" : "#331100"}`,
          borderRadius: "10px", padding: "8px 20px", textAlign: "center",
          boxShadow: totalBet > 0 ? "0 0 16px #ff660033" : "none",
        }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#664400" }}>APOSTADO</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: totalBet > 0 ? "#ff6600" : "#332200" }}>
            ${totalBet}
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div style={{ position: "relative" }}>
        <div style={{
          borderRadius: "50%",
          padding: "4px",
          background: winFlash
            ? "linear-gradient(135deg, #ffcc00, #ff6600)"
            : "linear-gradient(135deg, #331100, #1a0800)",
          boxShadow: winFlash ? "0 0 40px #ffcc0088" : "0 0 20px #00000088",
          transition: "all 0.3s",
        }}>
          <canvas ref={canvasRef} width={260} height={260} style={{ borderRadius: "50%", display: "block" }} />
        </div>
        {/* Pointer */}
        <div style={{
          position: "absolute", top: "-2px", left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "18px solid #ffcc00",
          filter: "drop-shadow(0 0 6px #ffcc00)",
          zIndex: 10,
        }} />
      </div>

      {/* Result */}
      {result && (
        <div style={{
          width: "100%", maxWidth: "380px",
          padding: "16px", borderRadius: "16px", textAlign: "center",
          background: result.won
            ? "linear-gradient(135deg, #0a2a00, #1a4400)"
            : "linear-gradient(135deg, #2a0000, #1a0500)",
          border: `3px solid ${result.won ? "#44ff00" : "#ff2200"}`,
          boxShadow: result.won
            ? "0 0 40px #44ff0066, 0 0 80px #ffcc0033"
            : "0 0 20px #ff220033",
          animation: result.won ? "winPulse 0.6s ease" : "none",
        }}>
          <div style={{
            fontSize: "56px", fontWeight: "900", lineHeight: 1,
            color: RED.includes(result.number) ? "#ff4444" : "#ffffff",
            textShadow: `0 0 30px ${RED.includes(result.number) ? "#ff0000" : "#aaaaff"}`,
          }}>{result.number}</div>
          {result.won ? (
            <div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#ffcc00", letterSpacing: "2px", marginTop: "6px", textShadow: "0 0 20px #ffcc00" }}>
                💰 ¡¡GANASTE!!
              </div>
              <div style={{ fontSize: "36px", fontWeight: "900", color: "#44ff00", textShadow: "0 0 20px #44ff00" }}>
                +${result.payout}
              </div>
              <div style={{ fontSize: "13px", color: "#88ff44", marginTop: "4px", letterSpacing: "1px" }}>
                🎊 ¡INCREÍBLE! ¡SIGUE ASÍ! 🎊
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "#ff6644", marginTop: "8px" }}>
              No era tu número... ¡La próxima es tuya! 🔥
            </div>
          )}
        </div>
      )}

      {/* Bet amount selector */}
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#664400", textAlign: "center", marginBottom: "6px" }}>
          MONTO POR NÚMERO — toca para seleccionar
        </div>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          {[5, 10, 25, 50, 100].map(v => (
            <button key={v} onClick={() => setActiveBet(v)} style={{
              flex: 1, padding: "7px 4px",
              borderRadius: "7px",
              border: activeBet === v ? "2px solid #ff6600" : "1px solid #331100",
              background: activeBet === v ? "#1a0800" : "#0d0500",
              color: activeBet === v ? "#ff6600" : "#442200",
              fontSize: "12px", fontWeight: activeBet === v ? "bold" : "normal",
              cursor: "pointer", fontFamily: "Georgia, serif",
            }}>${v}</button>
          ))}
        </div>
      </div>

      {/* Number grid */}
      <div style={{
        width: "100%", maxWidth: "380px",
        background: "#0d0500", border: "1px solid #331100",
        borderRadius: "12px", padding: "12px",
      }}>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#664400", textAlign: "center", marginBottom: "10px" }}>
          NÚMEROS 0–13 — máx. 3 ({betCount}/3 seleccionados)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "center" }}>
          {NUMBERS.map(n => {
            const isRed = RED.includes(n);
            const betAmt = bets[n];
            const selected = betAmt !== undefined;
            return (
              <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <button onClick={() => toggleBet(n)} style={{
                  width: "52px", height: "52px",
                  borderRadius: "10px",
                  border: selected ? "3px solid #ffcc00" : `2px solid ${isRed ? "#880000" : "#333"}`,
                  background: selected
                    ? (isRed ? "linear-gradient(135deg,#ff2200,#ff6600)" : "linear-gradient(135deg,#0033cc,#0066ff)")
                    : (isRed ? "linear-gradient(135deg,#3a0000,#220000)" : "linear-gradient(135deg,#111,#1a1a1a)"),
                  color: selected ? "#fff" : isRed ? "#cc3300" : "#555",
                  fontSize: "18px", fontWeight: "900",
                  cursor: phase === "idle" ? "pointer" : "default",
                  boxShadow: selected
                    ? `0 0 16px ${isRed ? "#ff440088" : "#0055ff88"}, 0 4px 8px #00000066`
                    : "0 2px 4px #00000044",
                  fontFamily: "Georgia, serif",
                  transition: "all 0.15s",
                  transform: selected ? "scale(1.08)" : "scale(1)",
                  textShadow: selected ? "0 0 8px #fff" : "none",
                }}>{n}</button>
                {/* Mini bet adjust */}
                {selected && (
                  <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                    <button onClick={() => changeBetAmount(n, -5)} style={{
                      width: "14px", height: "14px", fontSize: "10px", padding: 0,
                      background: "#1a0800", border: "1px solid #331100",
                      color: "#ff6600", cursor: "pointer", borderRadius: "3px",
                      lineHeight: "12px", fontFamily: "Georgia",
                    }}>−</button>
                    <span style={{ fontSize: "9px", color: "#ffcc00", minWidth: "18px", textAlign: "center" }}>
                      ${betAmt}
                    </span>
                    <button onClick={() => changeBetAmount(n, 5)} style={{
                      width: "14px", height: "14px", fontSize: "10px", padding: 0,
                      background: "#1a0800", border: "1px solid #331100",
                      color: "#ff6600", cursor: "pointer", borderRadius: "3px",
                      lineHeight: "12px", fontFamily: "Georgia",
                    }}>+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "380px" }}>
        <button
          onClick={phase === "result" ? newRound : startSpin}
          disabled={phase === "spinning" || phase === "stopping" || (phase === "idle" && (totalBet === 0 || balance < totalBet))}
          style={{
            flex: 1, padding: "15px",
            borderRadius: "12px", border: "none",
            background: (phase === "spinning" || phase === "stopping" || (phase === "idle" && totalBet === 0))
              ? "#0d0500"
              : "linear-gradient(135deg, #cc6600, #ff9900, #ffcc00)",
            color: (phase === "spinning" || phase === "stopping" || (phase === "idle" && totalBet === 0)) ? "#331100" : "#000",
            fontSize: "16px", fontWeight: "900", letterSpacing: "2px",
            cursor: "pointer", fontFamily: "Georgia, serif",
            boxShadow: phase === "idle" && totalBet > 0 ? "0 4px 20px #ff990066" : "none",
          }}>
          {phase === "result" ? "🔄 NUEVA" : "▶ INICIO"}
        </button>

        <button
          onClick={stopSpin}
          disabled={phase !== "spinning"}
          style={{
            flex: 1, padding: "15px",
            borderRadius: "12px", border: "none",
            background: phase === "spinning"
              ? "linear-gradient(135deg, #aa0000, #ff2222)"
              : "#0d0500",
            color: phase === "spinning" ? "#fff" : "#331100",
            fontSize: "16px", fontWeight: "900", letterSpacing: "2px",
            cursor: phase === "spinning" ? "pointer" : "default",
            fontFamily: "Georgia, serif",
            boxShadow: phase === "spinning" ? "0 4px 20px #ff000066" : "none",
            animation: phase === "spinning" ? "pulse 1s ease infinite" : "none",
          }}>
          ⏹ PARE
        </button>
      </div>

      {/* Stats */}
      <div style={{
        width: "100%", maxWidth: "380px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
      }}>
        {[
          { label: "TIRADAS", value: stats.spins },
          { label: "BALANCE", value: `$${balance}`, color: balance >= 500 ? "#44ff88" : "#ff4444" },
          { label: "GANANCIA NETA", value: `${balance - 500 >= 0 ? "+" : ""}$${balance - 500}`, color: balance >= 500 ? "#44ff88" : "#ff4444" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#0d0500", border: "1px solid #331100",
            borderRadius: "8px", padding: "8px", textAlign: "center",
          }}>
            <div style={{ fontSize: "8px", color: "#442200", letterSpacing: "1px" }}>{s.label}</div>
            <div style={{ fontSize: "15px", fontWeight: "bold", color: s.color || "#f5e6c8" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Earnings History */}
      {history.length > 0 && (
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <div style={{
            fontSize: "9px", letterSpacing: "2px", color: "#664400",
            marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>📋 HISTORIAL DE GANANCIAS</span>
            <span style={{ color: "#442200" }}>{history.length} rondas</span>
          </div>
          <div style={{
            background: "#0d0500", border: "1px solid #331100",
            borderRadius: "12px", overflow: "hidden", maxHeight: "220px", overflowY: "auto"
          }}>
            {history.map((h, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px",
                borderBottom: i < history.length - 1 ? "1px solid #1a0800" : "none",
                background: h.won ? "#001a0008" : "transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: "900",
                    background: RED.includes(h.number)
                      ? "linear-gradient(135deg,#3a0000,#220000)"
                      : "linear-gradient(135deg,#111,#1a1a1a)",
                    color: RED.includes(h.number) ? "#ff4444" : "#aaa",
                    border: h.won ? "2px solid #ffcc00" : "1px solid #331100",
                  }}>{h.number}</div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#664400" }}>
                      Ronda #{stats.spins - i}
                    </div>
                    <div style={{ fontSize: "9px", color: "#442200" }}>
                      Apostaste: ${h.totalBet}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: "15px", fontWeight: "900",
                    color: h.won ? "#44ff00" : "#ff4444",
                  }}>
                    {h.won ? `+$${h.payout}` : `-$${h.totalBet}`}
                  </div>
                  <div style={{ fontSize: "9px", color: "#442200" }}>
                    Bal: ${h.balanceAfter}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#664400", marginBottom: "8px" }}>HISTORIAL</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {history.map((h, i) => (
              <div key={i} style={{
                width: "34px", height: "34px", borderRadius: "6px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "bold",
                background: RED.includes(h.number) ? "#660000" : "#111",
                color: "#fff",
                border: h.won ? "2px solid #ffcc00" : "1px solid #333",
                boxShadow: h.won ? "0 0 8px #ffcc0066" : "none",
              }}>{h.number}</div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes winPulse { 0%{transform:scale(0.9);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}


function SimulatorPanel() {
  const [simResult, setSimResult] = React.useState(null);
  const [running, setRunning] = React.useState(false);
  const [rounds, setRounds] = React.useState(500);
  const [simBet, setSimBet] = React.useState(10);
  const [simNums, setSimNums] = React.useState(3);

  const runSim = () => {
    setRunning(true);
    setSimResult(null);
    setTimeout(() => {
      let balance = 1000;
      const startBalance = balance;
      let totalBet = 0, totalWon = 0, wins = 0;
      const balanceHistory = [balance];

      for (let i = 0; i < rounds; i++) {
        const totalRoundBet = simBet * simNums;
        if (balance < totalRoundBet) break;
        balance -= totalRoundBet;
        totalBet += totalRoundBet;

        const picked = [];
        while (picked.length < simNums) {
          const n = Math.floor(Math.random() * 14);
          if (!picked.includes(n)) picked.push(n);
        }
        const landed = Math.floor(Math.random() * 14);
        if (picked.includes(landed)) {
          const payout = simBet * PAYOUT;
          balance += payout;
          totalWon += payout;
          wins++;
        }
        if (i % 10 === 0) balanceHistory.push(balance);
      }
      balanceHistory.push(balance);

      setSimResult({
        finalBalance: balance,
        startBalance,
        totalBet,
        totalWon,
        wins,
        losses: rounds - wins,
        roi: (((totalWon - totalBet) / totalBet) * 100).toFixed(1),
        houseKept: (totalBet - totalWon).toFixed(0),
        winRate: ((wins / rounds) * 100).toFixed(1),
        balanceHistory,
      });
      setRunning(false);
    }, 100);
  };

  const maxB = simResult ? Math.max(...simResult.balanceHistory) : 1000;
  const minB = simResult ? Math.min(...simResult.balanceHistory) : 0;

  return (
    <div style={{
      width:"100%",maxWidth:"380px",
      background:"#050010",border:"2px solid #4400aa",
      borderRadius:"14px",padding:"16px",
      boxShadow:"0 0 24px #4400aa44",
    }}>
      <div style={{fontSize:"11px",letterSpacing:"3px",color:"#7744cc",textAlign:"center",marginBottom:"12px"}}>
        🔬 SIMULADOR — ¿Funciona el truco?
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"12px"}}>
        {[{label:"RONDAS",vals:[100,500,1000],cur:rounds,set:setRounds},
          {label:"APUESTA $",vals:[5,10,25],cur:simBet,set:setSimBet,prefix:"$"},
          {label:"NÚMEROS",vals:[1,2,3],cur:simNums,set:setSimNums,suffix:" nº"}
        ].map(col => (
          <div key={col.label}>
            <div style={{fontSize:"8px",color:"#553399",marginBottom:"4px",letterSpacing:"1px"}}>{col.label}</div>
            {col.vals.map(v => (
              <button key={v} onClick={()=>col.set(v)} style={{
                display:"block",width:"100%",marginBottom:"3px",
                padding:"4px",borderRadius:"5px",
                border:col.cur===v?"1px solid #7744cc":"1px solid #220044",
                background:col.cur===v?"#1a0033":"#0a0015",
                color:col.cur===v?"#bb88ff":"#442266",
                fontSize:"11px",cursor:"pointer",fontFamily:"Georgia",
              }}>{col.prefix||""}{v}{col.suffix||""}</button>
            ))}
          </div>
        ))}
      </div>

      <button onClick={runSim} disabled={running} style={{
        width:"100%",padding:"12px",borderRadius:"10px",border:"none",
        background:running?"#0a0015":"linear-gradient(135deg,#4400aa,#8833ff)",
        color:running?"#442266":"#fff",
        fontSize:"14px",fontWeight:"900",letterSpacing:"2px",
        cursor:running?"default":"pointer",fontFamily:"Georgia",
        marginBottom:"14px",
      }}>
        {running?"⏳ Simulando...":"▶ SIMULAR AHORA"}
      </button>

      {simResult && (
        <div style={{
          padding:"16px",borderRadius:"12px",textAlign:"center",
          background:parseFloat(simResult.roi)>=0?"#001a00":"#1a0000",
          border:`2px solid ${parseFloat(simResult.roi)>=0?"#44ff88":"#ff4444"}`,
        }}>
          <div style={{fontSize:"9px",color:"#553399",letterSpacing:"2px",marginBottom:"4px"}}>RESULTADO FINAL — {rounds} RONDAS</div>
          <div style={{
            fontSize:"48px",fontWeight:"900",lineHeight:1,
            color:parseFloat(simResult.roi)>=0?"#44ff88":"#ff4444",
          }}>{simResult.roi}%</div>
          <div style={{fontSize:"12px",color:"#888",marginTop:"8px"}}>
            {parseFloat(simResult.roi)<0
              ?`❌ La casa ganó $${simResult.houseKept} de $${simResult.totalBet} apostados`
              :"✅ Racha positiva... prueba con 1000 rondas 😏"}
          </div>
        </div>
      )}
    </div>
  );
}
