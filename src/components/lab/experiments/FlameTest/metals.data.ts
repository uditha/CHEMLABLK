import type { MetalData } from "@/types";

// ─── Metal Data — All 7 Metals + Unknown ─────────────────────────────────────
// Flame colours and spectral data based on NIE Chemistry Practical Handbook
// and NIST Atomic Spectra Database

export const METALS: MetalData[] = [
  {
    id: "sodium",
    name: "Sodium",
    nameSi: "සෝඩියම්",
    nameTa: "சோடியம்",
    symbol: "Na",
    flameColor: "#FFA500",
    flameColorHex: "#FFA500",
    flameColorSecondary: "#FFD700",
    spectrumLines: [
      { wavelength: 589.0, intensity: 1.0, color: "#FFA500" },
      { wavelength: 589.6, intensity: 0.95, color: "#FFA500" },
      { wavelength: 568.3, intensity: 0.15, color: "#ADFF2F" },
    ],
    electronTransition: {
      from: 3,
      to: 3,
      energyEv: 2.11,
      description: "3p → 3s transition, emitting 589 nm (D-lines)",
    },
    description:
      "Sodium produces an intense golden-yellow flame due to the 3p → 3s electron transition, emitting the characteristic sodium D-lines at 589.0 and 589.6 nm. The colour is so intense that sodium contamination can mask other metals.",
    descriptionSi:
      "සෝඩියම් 3p → 3s ඉලෙක්ට්‍රෝන සංක්‍රාන්තිය නිසා රන්වන් කහ ජ්වාලාවක් ඇති කරයි. 589 nm D-රේඛා.",
    descriptionTa:
      "சோடியம் 3p → 3s எலக்ட்ரான் மாற்றம் காரணமாக தங்க மஞ்சள் சுடரை உருவாக்குகிறது. 589 nm D-கோடுகள்.",
    wavelengthNm: 589,
  },
  {
    id: "potassium",
    name: "Potassium",
    nameSi: "පොටෑසියම්",
    nameTa: "பொட்டாசியம்",
    symbol: "K",
    flameColor: "#9966CC",
    flameColorHex: "#9966CC",
    flameColorSecondary: "#CC77FF",
    spectrumLines: [
      { wavelength: 766.5, intensity: 1.0, color: "#8B00FF" },
      { wavelength: 769.9, intensity: 0.95, color: "#8B00FF" },
      { wavelength: 404.4, intensity: 0.3, color: "#7700FF" },
    ],
    electronTransition: {
      from: 4,
      to: 4,
      energyEv: 1.61,
      description: "4p → 4s transition, emitting 766.5 nm (near IR, lilac visible)",
    },
    description:
      "Potassium gives a characteristic lilac/violet flame. The main emission lines are at 766.5 nm and 769.9 nm (barely visible red). The lilac colour seen is primarily due to weaker violet lines at ~404 nm. Use cobalt-blue glass to remove sodium interference.",
    descriptionSi:
      "පොටෑසියම් ලිලාක්/දම් ජ්වාලාවක් ඇති කරයි. ප්‍රධාන විකිරණ රේඛා 766.5 nm සහ 769.9 nm.",
    descriptionTa:
      "பொட்டாசியம் இளஞ்சிவப்பு/ஊதா சுடரை உருவாக்குகிறது. முக்கிய கோடுகள் 766.5 nm மற்றும் 769.9 nm.",
    wavelengthNm: 766,
  },
  {
    id: "lithium",
    name: "Lithium",
    nameSi: "ලිතියම්",
    nameTa: "லித்தியம்",
    symbol: "Li",
    flameColor: "#FF1744",
    flameColorHex: "#FF1744",
    flameColorSecondary: "#FF5252",
    spectrumLines: [
      { wavelength: 670.8, intensity: 1.0, color: "#FF0000" },
      { wavelength: 610.4, intensity: 0.4, color: "#FF4500" },
      { wavelength: 460.3, intensity: 0.1, color: "#4169E1" },
    ],
    electronTransition: {
      from: 2,
      to: 2,
      energyEv: 1.85,
      description: "2p → 2s transition, emitting 670.8 nm (bright crimson red)",
    },
    description:
      "Lithium produces a brilliant crimson-red flame. The dominant emission is the 2p → 2s transition at 670.8 nm. Lithium compounds are used in red fireworks and signal flares.",
    descriptionSi:
      "ලිතියම් දීප්තිමත් රතු ජ්වාලාවක් ඇති කරයි. ප්‍රධාන විකිරණය 2p → 2s සංක්‍රාන්තිය 670.8 nm.",
    descriptionTa:
      "லித்தியம் ஒளிரும் சிவப்பு சுடரை உருவாக்குகிறது. முக்கிய உமிழ்வு 2p → 2s மாற்றம் 670.8 nm.",
    wavelengthNm: 671,
  },
  {
    id: "calcium",
    name: "Calcium",
    nameSi: "කැල්සියම්",
    nameTa: "கால்சியம்",
    symbol: "Ca",
    flameColor: "#FF8F00",
    flameColorHex: "#FF8F00",
    flameColorSecondary: "#FFA726",
    spectrumLines: [
      { wavelength: 616.2, intensity: 0.8, color: "#FF4500" },
      { wavelength: 643.9, intensity: 1.0, color: "#FF2400" },
      { wavelength: 422.7, intensity: 0.6, color: "#6A0DAD" },
    ],
    electronTransition: {
      from: 4,
      to: 4,
      energyEv: 1.69,
      description: "4s² excitation, emitting orange-red band spectrum",
    },
    description:
      "Calcium gives a brick-orange flame. The colour comes from the emission of calcium atoms (predominantly at 616–644 nm). Calcium is also a component of red fireworks.",
    descriptionSi:
      "කැල්සියම් ගඩොල් තැඹිලි ජ්වාලාවක් ඇති කරයි. ප්‍රධාන විකිරණය 616–644 nm.",
    descriptionTa:
      "கால்சியம் செங்கல் ஆரஞ்சு சுடரை உருவாக்குகிறது. முக்கிய உமிழ்வு 616–644 nm.",
    wavelengthNm: 623,
  },
  {
    id: "strontium",
    name: "Strontium",
    nameSi: "ස්ට්‍රොන්ෂියම්",
    nameTa: "ஸ்ட்ரோன்டியம்",
    symbol: "Sr",
    flameColor: "#E53935",
    flameColorHex: "#E53935",
    flameColorSecondary: "#F44336",
    spectrumLines: [
      { wavelength: 460.7, intensity: 0.5, color: "#4169E1" },
      { wavelength: 606.0, intensity: 0.8, color: "#FF4500" },
      { wavelength: 636.0, intensity: 1.0, color: "#DC143C" },
      { wavelength: 670.0, intensity: 0.7, color: "#FF0000" },
      { wavelength: 707.0, intensity: 0.4, color: "#8B0000" },
    ],
    electronTransition: {
      from: 5,
      to: 5,
      energyEv: 1.80,
      description: "Strontium band spectrum, multiple transitions creating crimson",
    },
    description:
      "Strontium produces a brilliant crimson-red flame, distinctly deeper red than lithium. Multiple emission bands in the red region (606–707 nm) combine to give the characteristic colour. Strontium is used in red distress flares and fireworks.",
    descriptionSi:
      "ස්ට්‍රොන්ෂියම් දීප්තිමත් රතු ජ්වාලාවක් ඇති කරයි. 606–707 nm.",
    descriptionTa:
      "ஸ்ட்ரோன்டியம் ஒளிரும் சிவப்பு சுடரை உருவாக்குகிறது. 606–707 nm.",
    wavelengthNm: 636,
  },
  {
    id: "barium",
    name: "Barium",
    nameSi: "බේරියම්",
    nameTa: "பேரியம்",
    symbol: "Ba",
    flameColor: "#66BB6A",
    flameColorHex: "#66BB6A",
    flameColorSecondary: "#81C784",
    spectrumLines: [
      { wavelength: 487.0, intensity: 0.6, color: "#00BFFF" },
      { wavelength: 513.7, intensity: 0.9, color: "#00FF7F" },
      { wavelength: 524.2, intensity: 0.8, color: "#32CD32" },
      { wavelength: 553.5, intensity: 1.0, color: "#7FFF00" },
    ],
    electronTransition: {
      from: 6,
      to: 6,
      energyEv: 2.24,
      description: "Barium band spectrum, dominant green emission at 553 nm",
    },
    description:
      "Barium gives an apple-green or yellow-green flame. The colour is due to BaO and BaOH species in the flame, emitting bands around 487–554 nm. Barium compounds are used in green fireworks.",
    descriptionSi:
      "බේරියම් ඇපල්-කොළ ජ්වාලාවක් ඇති කරයි. 487–554 nm.",
    descriptionTa:
      "பேரியம் ஆப்பிள்-பச்சை சுடரை உருவாக்குகிறது. 487–554 nm.",
    wavelengthNm: 554,
  },
  {
    id: "copper",
    name: "Copper",
    nameSi: "තඹ",
    nameTa: "செம்பு",
    symbol: "Cu",
    flameColor: "#00BCD4",
    flameColorHex: "#00BCD4",
    flameColorSecondary: "#26C6DA",
    spectrumLines: [
      { wavelength: 427.5, intensity: 0.6, color: "#4B0082" },
      { wavelength: 465.1, intensity: 0.8, color: "#0000FF" },
      { wavelength: 510.5, intensity: 1.0, color: "#00FF00" },
      { wavelength: 521.8, intensity: 0.9, color: "#32CD32" },
      { wavelength: 578.2, intensity: 0.5, color: "#FFD700" },
    ],
    electronTransition: {
      from: 4,
      to: 4,
      energyEv: 2.43,
      description: "Copper transitions, blue-green emission 427–521 nm",
    },
    description:
      "Copper produces a distinctive blue-green or emerald-green flame. The colour is due to CuCl and CuOH species in the flame. If copper chloride is used, the colour tends toward blue; copper in other salts gives blue-green.",
    descriptionSi:
      "තඹ නිල්-කොළ ජ්වාලාවක් ඇති කරයි. CuCl සහ CuOH ශ්‍රේණීන් 427–521 nm.",
    descriptionTa:
      "செம்பு நீல-பச்சை சுடரை உருவாக்குகிறது. CuCl மற்றும் CuOH வகைகள் 427–521 nm.",
    wavelengthNm: 515,
  },
];

// Unknown sample — randomly maps to one metal (used in Exam mode)
export const UNKNOWN_METAL: MetalData = {
  id: "unknown",
  name: "Unknown Sample",
  nameSi: "නොදන්නා නිදර්ශනය",
  nameTa: "தெரியாத மாதிரி",
  symbol: "?",
  flameColor: "#888888",
  flameColorHex: "#888888",
  spectrumLines: [],
  electronTransition: {
    from: 0,
    to: 0,
    energyEv: 0,
    description: "Unknown — identify from the flame colour",
  },
  description: "An unknown sample. Perform the flame test and identify the metal from the colour.",
  descriptionSi: "නොදන්නා නිදර්ශනයකි. ජ්වාලා පරීක්ෂාව ඇතිව ලෝහය හඳුනා ගන්න.",
  descriptionTa: "தெரியாத மாதிரி. சுடர் சோதனை மூலம் உலோகத்தை கண்டறியவும்.",
  isUnknown: true,
};

export function getMetalById(id: string): MetalData | undefined {
  return METALS.find((m) => m.id === id);
}

export function getRandomMetal(): MetalData {
  return METALS[Math.floor(Math.random() * METALS.length)];
}
