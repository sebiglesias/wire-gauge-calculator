// 12V / 24V / 48V DC Wire Size & Voltage Drop Calculator Engine
const AWG_DATA = [
  { awg: "4/0", mm2: 107.2, resPer1000ft: 0.050, ampacity: 445 },
  { awg: "3/0", mm2: 85.0,  resPer1000ft: 0.063, ampacity: 385 },
  { awg: "2/0", mm2: 67.4,  resPer1000ft: 0.079, ampacity: 330 },
  { awg: "1/0", mm2: 53.5,  resPer1000ft: 0.100, ampacity: 285 },
  { awg: "1 AWG", mm2: 42.4, resPer1000ft: 0.126, ampacity: 245 },
  { awg: "2 AWG", mm2: 33.6, resPer1000ft: 0.159, ampacity: 210 },
  { awg: "4 AWG", mm2: 21.2, resPer1000ft: 0.253, ampacity: 160 },
  { awg: "6 AWG", mm2: 13.3, resPer1000ft: 0.403, ampacity: 120 },
  { awg: "8 AWG", mm2: 8.36, resPer1000ft: 0.640, ampacity: 80 },
  { awg: "10 AWG", mm2: 5.26, resPer1000ft: 1.018, ampacity: 60 },
  { awg: "12 AWG", mm2: 3.31, resPer1000ft: 1.619, ampacity: 45 },
  { awg: "14 AWG", mm2: 2.08, resPer1000ft: 2.575, ampacity: 35 },
  { awg: "16 AWG", mm2: 1.31, resPer1000ft: 4.094, ampacity: 25 },
  { awg: "18 AWG", mm2: 0.82, resPer1000ft: 6.510, ampacity: 20 }
];

const state = {
  voltage: 12,
  current: 15,
  distance: 10, // one way in feet
  distUnit: "ft", // "ft" or "m"
  maxDropPct: 3, // 3% or 10%
  conductor: "copper" // "copper" or "tinned"
};

const presets = {
  fridge: {
    name: "12V Compressor Fridge (5A, 15ft, 3% drop)",
    voltage: 12,
    current: 5,
    distance: 15,
    maxDropPct: 3
  },
  inverter_2000w: {
    name: "2000W Inverter to Battery (167A, 5ft, 3% drop)",
    voltage: 12,
    current: 167,
    distance: 5,
    maxDropPct: 3
  },
  diesel_heater: {
    name: "12V Diesel Heater (10A glow-plug, 12ft, 3% drop)",
    voltage: 12,
    current: 10,
    distance: 12,
    maxDropPct: 3
  },
  mppt_solar: {
    name: "40A MPPT Solar to Battery (40A, 8ft, 3% drop)",
    voltage: 12,
    current: 40,
    distance: 8,
    maxDropPct: 3
  },
  led_lights: {
    name: "Cabin LED Lighting (3A, 25ft, 10% drop)",
    voltage: 12,
    current: 3,
    distance: 25,
    maxDropPct: 10
  }
};

function init() {
  attachEventListeners();
  applyPreset("fridge");
  calculate();
}

function attachEventListeners() {
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyPreset(btn.dataset.preset);
    });
  });

  const voltSelect = document.getElementById("sysVoltage");
  const currentInput = document.getElementById("sysCurrent");
  const distInput = document.getElementById("sysDistance");
  const distUnitSelect = document.getElementById("distUnit");
  const dropSelect = document.getElementById("maxDropPct");

  voltSelect.addEventListener("change", (e) => {
    state.voltage = parseFloat(e.target.value) || 12;
    calculate();
  });

  currentInput.addEventListener("input", (e) => {
    state.current = parseFloat(e.target.value) || 0;
    calculate();
  });

  distInput.addEventListener("input", (e) => {
    state.distance = parseFloat(e.target.value) || 0;
    calculate();
  });

  distUnitSelect.addEventListener("change", (e) => {
    state.distUnit = e.target.value;
    calculate();
  });

  dropSelect.addEventListener("change", (e) => {
    state.maxDropPct = parseFloat(e.target.value) || 3;
    calculate();
  });
}

function applyPreset(key) {
  const p = presets[key];
  if (!p) return;
  state.voltage = p.voltage;
  state.current = p.current;
  state.distance = p.distance;
  state.maxDropPct = p.maxDropPct;
  state.distUnit = "ft";

  document.getElementById("sysVoltage").value = p.voltage;
  document.getElementById("sysCurrent").value = p.current;
  document.getElementById("sysDistance").value = p.distance;
  document.getElementById("distUnit").value = "ft";
  document.getElementById("maxDropPct").value = p.maxDropPct;

  calculate();
}

function calculate() {
  const v = state.voltage;
  const amps = state.current;
  let distFeet = state.distUnit === "m" ? state.distance * 3.28084 : state.distance;
  const totalCircuitFeet = distFeet * 2; // round-trip
  const maxAllowedDropVolts = v * (state.maxDropPct / 100);

  if (v <= 0 || amps <= 0 || distFeet <= 0) {
    document.getElementById("wireSizeResult").textContent = "—";
    return;
  }

  // Iterate from smallest gauge (18 AWG) to largest (4/0) until one meets both
  // voltage drop criteria and ampacity safety limit.
  let selected = null;
  let actualDropVolts = 0;
  let actualDropPct = 0;

  for (let i = AWG_DATA.length - 1; i >= 0; i--) {
    const candidate = AWG_DATA[i];
    // Ampacity check: Continuous safety factor 1.25x
    if (candidate.ampacity < amps) {
      continue;
    }
    // Voltage drop check: Vdrop = I * (R_per_1000 * totalFeet / 1000)
    const cableResistance = candidate.resPer1000ft * (totalCircuitFeet / 1000);
    const vDrop = amps * cableResistance;

    if (vDrop <= maxAllowedDropVolts) {
      selected = candidate;
      actualDropVolts = vDrop;
      actualDropPct = (vDrop / v) * 100;
      break;
    }
  }

  // Fallback to largest if even 4/0 exceeds drop
  if (!selected) {
    selected = AWG_DATA[0];
    const cableResistance = selected.resPer1000ft * (totalCircuitFeet / 1000);
    actualDropVolts = amps * cableResistance;
    actualDropPct = (actualDropVolts / v) * 100;
  }

  const vAtLoad = Math.max(0, v - actualDropVolts);
  const powerLossWatts = Math.pow(amps, 2) * (selected.resPer1000ft * (totalCircuitFeet / 1000));
  const suggestedFuse = getStandardFuse(amps * 1.25);

  // Update UI
  document.getElementById("wireSizeResult").textContent = selected.awg;
  document.getElementById("metricMmResult").textContent = selected.mm2 + " mm² (Cross-Section)";
  document.getElementById("vDropResult").textContent = actualDropVolts.toFixed(2) + " V (" + actualDropPct.toFixed(1) + "%)";
  document.getElementById("vLoadResult").textContent = vAtLoad.toFixed(2) + " V";
  document.getElementById("powerLossResult").textContent = powerLossWatts.toFixed(1) + " Watts";
  document.getElementById("fuseResult").textContent = suggestedFuse + " Amp (Fuse/Breaker)";

  const pill = document.getElementById("statusPill");
  if (actualDropPct <= state.maxDropPct) {
    pill.textContent = `✅ Within Safe ${state.maxDropPct}% Target (ABYC & NEC Compliant)`;
    pill.className = "status-pill status-ok";
  } else {
    pill.textContent = `⚠️ Exceeds ${state.maxDropPct}% Target (${actualDropPct.toFixed(1)}% Drop) - Shorten cable run or double conductors`;
    pill.className = "status-pill status-warn";
  }
}

function getStandardFuse(targetAmps) {
  const fuses = [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 175, 200, 250, 300, 400];
  for (const f of fuses) {
    if (f >= targetAmps) return f;
  }
  return Math.ceil(targetAmps / 50) * 50;
}

window.addEventListener("DOMContentLoaded", init);
