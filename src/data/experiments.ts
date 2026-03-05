import type { ExperimentData } from "@/types";

// ─── All 43 NIE A/L Chemistry Practicals ─────────────────────────────────────

export const EXPERIMENTS: ExperimentData[] = [
  // ── Unit 01: Structure of Atom ────────────────────────────────────────────
  {
    id: "exp-01",
    slug: "cathode-rays",
    unit: 1,
    title: "Properties of Cathode Rays (Discharge Tube)",
    titleSi: "කැතෝඩ් රශ්මිවල ගුණ (විසර්ජන නළය)",
    titleTa: "கேதோட் கதிர்களின் பண்புகள் (வெளியேற்று குழாய்)",
    description:
      "Investigate the properties of cathode rays using a discharge tube. Observe deflection by electric and magnetic fields.",
    difficulty: "Medium",
    priority: "P2",
    status: "Built",
  },
  {
    id: "exp-02",
    slug: "flame-test",
    unit: 1,
    title: "Flame Tests — Na, K, Li, Ca, Sr, Ba, Cu",
    titleSi: "ජ්වාලා පරීක්ෂණ — Na, K, Li, Ca, Sr, Ba, Cu",
    titleTa: "சுடர் சோதனைகள் — Na, K, Li, Ca, Sr, Ba, Cu",
    description:
      "Identify metal ions by the characteristic colours they produce in a flame. The golden-yellow of sodium, lilac of potassium, crimson of lithium — each element's signature in light.",
    difficulty: "Easy",
    priority: "P1",
    status: "Built",
  },
  // ── Unit 03: Solutions ────────────────────────────────────────────────────
  {
    id: "exp-03",
    slug: "standard-solution-na2co3",
    unit: 3,
    title: "Preparation of Standard Solution of Na₂CO₃",
    titleSi: "Na₂CO₃ හි සම්මත දිය කිරීම සකස් කිරීම",
    titleTa: "Na₂CO₃ இன் தரமான கரைசல் தயாரித்தல்",
    description:
      "Accurately prepare a primary standard solution of anhydrous sodium carbonate for use in volumetric analysis.",
    difficulty: "Easy",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-04",
    slug: "solution-preparation-dilution",
    unit: 3,
    title: "Preparation of Solutions and Dilution",
    titleSi: "ද්‍රාවණ සකස් කිරීම සහ තනුක කිරීම",
    titleTa: "கரைசல்கள் தயாரித்தல் மற்றும் நீர்த்தல்",
    description:
      "Prepare solutions of known concentration by weighing, dissolving, and making up to volume. Perform serial dilutions and understand molarity calculations.",
    difficulty: "Easy",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 04: Stoichiometry ────────────────────────────────────────────────
  {
    id: "exp-05",
    slug: "molar-volume-gas-o2",
    unit: 4,
    title: "Molar Volume of Gas — O₂ by Water Displacement",
    titleSi: "වායුවේ මෝල් පරිමාව — ජල විස්ථාපනය මගින් O₂",
    titleTa: "வாயுவின் மோலார் கனவளவு — நீர் இடப்பெயர்வால் O₂",
    description:
      "Determine the molar volume of oxygen at room temperature and pressure by decomposing hydrogen peroxide with MnO₂ catalyst.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-06",
    slug: "relative-atomic-mass-mg",
    unit: 4,
    title: "Relative Atomic Mass of Mg (Mg + HCl Gas Method)",
    titleSi: "Mg හි සාපේක්ෂ පරමාණුක ස්කන්ධය",
    titleTa: "Mg இன் சார்பு அணு நிறை",
    description:
      "Determine the relative atomic mass of magnesium by measuring the volume of hydrogen produced when a known mass reacts with excess HCl.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 05: Energetics ───────────────────────────────────────────────────
  {
    id: "exp-07",
    slug: "enthalpy-neutralisation",
    unit: 5,
    title: "Enthalpy of Neutralisation — Strong Acid + Base",
    titleSi: "උදාසීනකරණයේ ශක්‍යතාව — ශක්තිමත් අම්ලය + භාෂ්ම",
    titleTa: "நடுநிலைப்படுத்தலின் என்தால்பி",
    description:
      "Measure the heat released when HCl reacts with NaOH using a simple calorimeter. Calculate ΔH neutralisation and compare with the theoretical −57 kJ mol⁻¹.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-08",
    slug: "enthalpy-dissolution",
    unit: 5,
    title: "Enthalpy of Dissolution",
    titleSi: "දිය කිරීමේ ශක්‍යතාව",
    titleTa: "கரைவதன் என்தால்பி",
    description:
      "Measure the temperature change when solids dissolve in water. Compare endothermic (NH₄NO₃) and exothermic (NaOH) dissolution processes.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-09",
    slug: "validation-hess-law",
    unit: 5,
    title: "Validation of Hess's Law (NaOH Pathways P/Q/R)",
    titleSi: "හෙස්ගේ නියමය සත්‍යාපනය කිරීම",
    titleTa: "ஹெஸ் விதியை சரிபார்த்தல்",
    description:
      "Verify Hess's Law using three reaction pathways for NaOH. The sum of ΔH for indirect routes equals the direct route — Hess's Law demonstrated experimentally.",
    difficulty: "Hard",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 06: Chemical Equilibrium / Inorganic ─────────────────────────────
  {
    id: "exp-10",
    slug: "nitrogen-in-air",
    unit: 6,
    title: "Presence of Nitrogen in Air",
    titleSi: "වාතයේ නයිට්‍රජන් ඇතිවීම",
    titleTa: "காற்றில் நைட்ரஜனின் இருப்பு",
    description:
      "Remove oxygen from air using copper and demonstrate that the remaining gas (mostly nitrogen) does not support combustion.",
    difficulty: "Easy",
    priority: "P3",
    status: "Planned",
  },
  {
    id: "exp-11",
    slug: "fe2-determination-kmno4",
    unit: 6,
    title: "Fe²⁺ Determination Using Acidified KMnO₄",
    titleSi: "KMnO₄ භාවිතයෙන් Fe²⁺ තීරණය කිරීම",
    titleTa: "அமிலமயமான KMnO₄ பயன்படுத்தி Fe²⁺ தீர்மானிக்கல்",
    description:
      "Determine the concentration of iron(II) by titration with KMnO₄. Watch the deep purple decolourise with each drop — until the endpoint when it stays.",
    difficulty: "Hard",
    priority: "P1",
    status: "Planned",
  },
  {
    id: "exp-12",
    slug: "k2c2o4-permanganate-titration",
    unit: 6,
    title: "K₂C₂O₄ Concentration by Permanganate Titration",
    titleSi: "KMnO₄ ටයිට්‍රේෂනය මගින් K₂C₂O₄ සාන්ද්‍රනය",
    titleTa: "KMnO₄ ஆல் தைட்ரேஷன் மூலம் K₂C₂O₄ செறிவு",
    description:
      "Determine the concentration of potassium oxalate using acidified permanganate. The reaction requires warming to 60°C to proceed at a practical rate.",
    difficulty: "Hard",
    priority: "P1",
    status: "Planned",
  },
  {
    id: "exp-13",
    slug: "allotropes-sulphur",
    unit: 6,
    title: "Preparation of Allotropes of Sulphur",
    titleSi: "සල්ෆර් අලොට්‍රොප් සකස් කිරීම",
    titleTa: "கந்தகத்தின் அலோட்ரோப்கள் தயாரித்தல்",
    description:
      "Prepare rhombic and monoclinic sulphur by controlled crystallisation. Observe how the same element can have different crystal structures.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-14",
    slug: "preparation-so2-properties",
    unit: 6,
    title: "Preparation of SO₂ and Testing Its Properties",
    titleSi: "SO₂ සකස් කිරීම සහ ගුණ පරීක්ෂා කිරීම",
    titleTa: "SO₂ தயாரித்தல் மற்றும் பண்புகளை சோதித்தல்",
    description:
      "Generate SO₂ and test its bleaching, acidic, and reducing properties. See how the pale yellow gas decolourises potassium dichromate paper.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-15",
    slug: "preparation-cl2-properties",
    unit: 6,
    title: "Preparation of Cl₂ and Testing Its Properties",
    titleSi: "Cl₂ සකස් කිරීම සහ ගුණ පරීක්ෂා කිරීම",
    titleTa: "Cl₂ தயாரித்தல் மற்றும் பண்புகளை சோதித்தல்",
    description:
      "Prepare chlorine from MnO₂ and concentrated HCl. Test its bleaching power on moist litmus paper and investigate its displacement reactions with bromides and iodides.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-16",
    slug: "cu2-zn2-naoh-nh3",
    unit: 6,
    title: "Cu²⁺ and Zn²⁺ with NaOH(aq) and NH₃(aq)",
    titleSi: "NaOH(aq) සහ NH₃(aq) සමඟ Cu²⁺ සහ Zn²⁺",
    titleTa: "NaOH(aq) மற்றும் NH₃(aq) உடன் Cu²⁺ மற்றும் Zn²⁺",
    description:
      "Test copper(II) and zinc(II) with NaOH and NH₃. Watch the pale blue Cu(OH)₂ precipitate dissolve in excess NH₃ to form the deep Schweizer's reagent blue.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-17",
    slug: "salt-analysis-d-block",
    unit: 6,
    title: "ID of Ni²⁺, Fe³⁺, Cu²⁺, Cr³⁺ Using NaOH and NH₃",
    titleSi: "NaOH සහ NH₃ භාවිතා කර d-block ලෝහ හඳුනා ගැනීම",
    titleTa: "d-block உலோக அயனிகளை அடையாளம் காணல்",
    description:
      "Systematically identify four d-block metal ions. Ni²⁺ = apple-green ppt. Fe³⁺ = rust-brown ppt. Cu²⁺ = pale blue ppt, deep blue in excess NH₃. Cr³⁺ = grey-green ppt, dissolves in NaOH.",
    difficulty: "Hard",
    priority: "P1",
    status: "Built",
  },
  // ── Unit 07: Organic Chemistry I ─────────────────────────────────────────
  {
    id: "exp-18",
    slug: "functional-group-identification",
    unit: 7,
    title: "Identification of Functional Groups (Organic Tests)",
    titleSi: "ක්‍රියාකාරී කණ්ඩායම් හඳුනා ගැනීම",
    titleTa: "செயல்பாட்டு குழுக்களை அடையாளம் காணல்",
    description:
      "Run a systematic flowchart of chemical tests to identify organic functional groups: alkenes, alcohols, aldehydes, ketones, acids, esters, amines, and amides.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-19",
    slug: "paper-chromatography-pigments",
    unit: 7,
    title: "Leaf Pigment Separation by Paper Chromatography",
    titleSi: "කඩදාසි වර්ණාලේඛනය මගින් කොළ වර්ණකය වෙන් කිරීම",
    titleTa: "காகித நிறப்பிரிகை மூலம் இலை நிறமிகளை பிரித்தல்",
    description:
      "Separate the colourful mixture of photosynthetic pigments in plant leaves. Calculate Rf values for chlorophyll a, chlorophyll b, xanthophylls, and carotene.",
    difficulty: "Easy",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 08: Organic Chemistry II ────────────────────────────────────────
  {
    id: "exp-20",
    slug: "unsaturation-test-br2-kmno4",
    unit: 8,
    title: "Bromine Water / KMnO₄ Test for Unsaturation (Alkenes)",
    titleSi: "අසංතෘප්තතාව සඳහා Br₂ ජලය / KMnO₄ පරීක්ෂණය",
    titleTa: "நிறைவற்ற தன்மைக்கு Br₂ நீர் / KMnO₄ சோதனை",
    description:
      "Detect carbon-carbon double bonds using bromine water (decolourisation) and acidified KMnO₄ (purple to colourless). Distinguish alkenes from alkanes.",
    difficulty: "Easy",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-21",
    slug: "halide-identification-organic",
    unit: 8,
    title: "Halide Identification in Organic Compounds",
    titleSi: "කාබනික සංයෝගවල හේලෝජනේෂන් හඳුනා ගැනීම",
    titleTa: "கரிம சேர்மங்களில் ஹாலைட்களை அடையாளம் காணல்",
    description:
      "Detect Cl, Br, or I in organic compounds using the sodium fusion test then silver nitrate. White (AgCl), cream (AgBr), or yellow (AgI) precipitate reveals the halogen.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 10: Carbonyl Compounds ───────────────────────────────────────────
  {
    id: "exp-22",
    slug: "tollens-test",
    unit: 10,
    title: "Tollens' Test — Aldehydes vs Ketones",
    titleSi: "ටොලෙන්ස් පරීක්ෂණය — ඇල්ඩිහයිඩ් සහ කීටෝන",
    titleTa: "டோலன்ஸ் சோதனை — ஆல்டிஹைட்கள் மற்றும் கீட்டோன்கள்",
    description:
      "Use Tollens' reagent (ammoniacal silver nitrate) to distinguish aldehydes from ketones. Aldehydes reduce Ag⁺ to a beautiful silver mirror coating the inside of the tube.",
    difficulty: "Easy",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-23",
    slug: "fehlings-test",
    unit: 10,
    title: "Fehling's Test — Aldehydes vs Ketones",
    titleSi: "ෆේලිං පරීක්ෂණය — ඇල්ඩිහයිඩ් සහ කීටෝන",
    titleTa: "ஃபெஹ்லிங் சோதனை — ஆல்டிஹைட்கள் மற்றும் கீட்டோன்கள்",
    description:
      "Deep blue Fehling's solution turns brick-red (Cu₂O precipitate) with aldehydes and reducing sugars — a colour change students never forget.",
    difficulty: "Easy",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-24",
    slug: "lucas-test",
    unit: 10,
    title: "Lucas Test — Distinguishing Alcohols (1°/2°/3°)",
    titleSi: "ලූකාස් පරීක්ෂණය — ඇල්කොහෝල් වෙන් කිරීම",
    titleTa: "லூக்காஸ் சோதனை — ஆல்கஹால்களை வேறுபடுத்துதல்",
    description:
      "Use Lucas reagent (ZnCl₂/conc. HCl) to distinguish 1°, 2°, and 3° alcohols by their rate of forming a cloudy chloroalkane layer.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-25",
    slug: "esterification",
    unit: 10,
    title: "Esterification Reaction",
    titleSi: "එස්ටර් කිරීමේ ප්‍රතික්‍රියාව",
    titleTa: "எஸ்டரிஃபிகேஷன் வினை",
    description:
      "Make a sweet-smelling ester by condensing a carboxylic acid with an alcohol over concentrated H₂SO₄ catalyst. Identify the ester by its characteristic odour.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-26",
    slug: "acid-hydrolysis-ester",
    unit: 10,
    title: "Acid Hydrolysis of an Ester",
    titleSi: "එස්ටර් ආම්ලික ජලජෙ‍ෙදනය",
    titleTa: "ஒரு எஸ்டரின் அமில நீராற்பகுப்பு",
    description:
      "Reverse the esterification reaction. Hydrolyse an ester under acidic conditions and identify the carboxylic acid and alcohol products.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-27",
    slug: "vinegar-back-titration",
    unit: 10,
    title: "% Acetic Acid in Vinegar (Back Titration)",
    titleSi: "ස්ස්‍රාවකයේ ඇසිටික් අම්ල ප්‍රතිශතය",
    titleTa: "வினிகரில் அசிட்டிக் அமில %",
    description:
      "Add excess NaOH to vinegar, then back-titrate with HCl. Calculate the percentage of acetic acid — a real-world application of volumetric analysis.",
    difficulty: "Hard",
    priority: "P1",
    status: "Planned",
  },
  // ── Unit 11: Nitrogen Compounds ───────────────────────────────────────────
  {
    id: "exp-28",
    slug: "distinguishing-amines",
    unit: 11,
    title: "Distinguishing 1°/2°/3° Amines",
    titleSi: "1°/2°/3° ඇමීන් වෙන් කිරීම",
    titleTa: "1°/2°/3° அமீன்களை வேறுபடுத்துதல்",
    description:
      "Apply the Hinsberg test and nitrous acid reactions to systematically distinguish primary, secondary, and tertiary amines.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-29",
    slug: "ninhydrin-test-amino-acids",
    unit: 11,
    title: "Ninhydrin Test for Amino Acids",
    titleSi: "ඇමයිනෝ අම්ල සඳහා නිංහයිඩ්‍රින් පරීක්ෂණය",
    titleTa: "அமினோ அமிலங்களுக்கான நின்ஹைட்ரின் சோதனை",
    description:
      "Detect amino acids with ninhydrin, producing the characteristic Ruhemann's purple. Test different food samples and amino acid solutions.",
    difficulty: "Easy",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-30",
    slug: "biuret-xanthoproteic-proteins",
    unit: 11,
    title: "Biuret Test / Xanthoproteic Test for Proteins",
    titleSi: "ප්‍රෝටීන් සඳහා බියුරෙට් / ශාන්තෝප්‍රෝටෙයික් පරීක්ෂණය",
    titleTa: "புரதங்களுக்கான பயூரெட் / சாந்தோப்ரோட்டீக் சோதனை",
    description:
      "Test for proteins using biuret (violet with Cu²⁺) and xanthoproteic (yellow with HNO₃) tests. Test egg white, milk, and other protein sources.",
    difficulty: "Easy",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 12: Kinetics ─────────────────────────────────────────────────────
  {
    id: "exp-31",
    slug: "iodine-clock-reaction",
    unit: 12,
    title: "Rate of Reaction: Effect of Concentration (Iodine Clock)",
    titleSi: "ප්‍රතික්‍රියාවේ වේගය: සාන්ද්‍රනයේ බලපෑම (අයඩින් ඔරලෝසු)",
    titleTa: "வினை வேகம்: செறிவின் விளைவு (அயோடின் கடிகாரம்)",
    description:
      "The most dramatic experiment in A/L chemistry. Mix the reagents, start the timer, watch the colourless solution... then SUDDENLY it turns black. Every time. Without warning.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-32",
    slug: "rate-reaction-temperature",
    unit: 12,
    title: "Rate of Reaction: Effect of Temperature",
    titleSi: "ප්‍රතික්‍රියාවේ වේගය: උෂ්ණත්වයේ බලපෑම",
    titleTa: "வினை வேகம்: வெப்பநிலையின் விளைவு",
    description:
      "Measure how temperature affects reaction rate. Use the Arrhenius equation to calculate activation energy from a ln(rate) vs 1/T graph.",
    difficulty: "Easy",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-33",
    slug: "rate-reaction-catalyst",
    unit: 12,
    title: "Rate of Reaction: Effect of Catalyst (H₂O₂ + MnO₂)",
    titleSi: "ප්‍රතික්‍රියාවේ වේගය: උත්ප්‍රේරකයේ බලපෑම",
    titleTa: "வினை வேகம்: வினையூக்கியின் விளைவு",
    description:
      "Add a few grains of MnO₂ to hydrogen peroxide and watch oxygen bubble furiously. The catalyst is not consumed. Measure volume of O₂ vs time.",
    difficulty: "Easy",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-34",
    slug: "order-of-reaction",
    unit: 12,
    title: "Determination of Order of Reaction from Experimental Data",
    titleSi: "අත්හදා බැලීමේ දත්ත වලින් ප්‍රතික්‍රියා පිළිවෙල නිර්ණය කිරීම",
    titleTa: "சோதனை தரவிலிருந்து வினையின் வரிசை தீர்மானித்தல்",
    description:
      "Analyse rate tables and concentration-time graphs to determine reaction orders using the initial rate method and graphical analysis.",
    difficulty: "Hard",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 13: Chemical Equilibrium / Acid-Base ─────────────────────────────
  {
    id: "exp-35",
    slug: "titration-hcl-naoh",
    unit: 13,
    title: "Acid-Base Titration: HCl vs NaOH (Strong/Strong)",
    titleSi: "අම්ල-භාෂ්ම ටයිට්‍රේෂනය: HCl සහ NaOH",
    titleTa: "அமில-காரம் தைட்ரேஷன்: HCl vs NaOH",
    description:
      "The foundational experiment of quantitative chemistry. One drop of NaOH tips the pink phenolphthalein to colourless at pH 7.0. Perfect technique required.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-36",
    slug: "titration-ch3cooh-naoh",
    unit: 13,
    title: "Acid-Base Titration: CH₃COOH vs NaOH (Weak/Strong)",
    titleSi: "අම්ල-භාෂ්ම ටයිට්‍රේෂනය: CH₃COOH සහ NaOH",
    titleTa: "அமில-காரம் தைட்ரேஷன்: CH₃COOH vs NaOH",
    description:
      "Titrate weak acetic acid with strong NaOH. The equivalence point is above pH 7 (why?). Plot the titration curve and identify the buffer region.",
    difficulty: "Hard",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-37",
    slug: "buffer-preparation-ph",
    unit: 13,
    title: "Buffer Preparation and pH Testing",
    titleSi: "බෆර් සකස් කිරීම සහ pH පරීක්ෂා කිරීම",
    titleTa: "இடைப்பட்ட கரைசல் தயாரித்தல் மற்றும் pH சோதனை",
    description:
      "Prepare acetate buffer solutions. Add small amounts of acid and base and measure pH. Demonstrate the remarkable resistance of buffers to pH change.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-38",
    slug: "ksp-determination",
    unit: 13,
    title: "Ksp Determination (Precipitation Reactions)",
    titleSi: "Ksp නිර්ණය කිරීම",
    titleTa: "Ksp தீர்மானித்தல்",
    description:
      "Measure the solubility of a sparingly soluble salt (e.g., BaSO₄) and calculate the solubility product Ksp at room temperature.",
    difficulty: "Hard",
    priority: "P2",
    status: "Planned",
  },
  // ── Unit 14: Electrochemistry ─────────────────────────────────────────────
  {
    id: "exp-39",
    slug: "electrolysis-cuso4",
    unit: 14,
    title: "Electrolysis of CuSO₄ — Mass Change, Faraday's Law",
    titleSi: "CuSO₄ ගේ විද්‍යුත් විශ්ලේෂණය — ෆැරඩේ නියමය",
    titleTa: "CuSO₄ இன் மின்னாற்பகுப்பு — ஃபாரடே விதி",
    description:
      "Electrolyse CuSO₄ with copper electrodes. The cathode gains mass (Cu deposits, pink). The anode loses mass (Cu dissolves). Verify Faraday's First Law with exact calculations.",
    difficulty: "Hard",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-40",
    slug: "electrolysis-brine",
    unit: 14,
    title: "Electrolysis of Brine (Products at Electrodes)",
    titleSi: "ලවණ ජලයේ විද්‍යුත් විශ්ලේෂණය",
    titleTa: "உப்புநீர் மின்னாற்பகுப்பு",
    description:
      "Pass current through brine (NaCl aq). Cl₂ gas at anode (bleaches damp litmus). H₂ at cathode (squeaky pop). NaOH left in solution. The chlor-alkali process in miniature.",
    difficulty: "Medium",
    priority: "P1",
    status: "Built",
  },
  {
    id: "exp-41",
    slug: "galvanic-cell-emf",
    unit: 14,
    title: "Galvanic Cell Construction — Measuring EMF",
    titleSi: "ගැල්වනික් සෛල ඉදිකිරීම — EMF මිනුම",
    titleTa: "கால்வனிக் கலன் கட்டுமானம் — EMF அளவிடல்",
    description:
      "Build Daniell cells and other galvanic cells. Measure EMF with a high-impedance voltmeter. Compare measured vs calculated values from the electrochemical series.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
  {
    id: "exp-42",
    slug: "cinnamon-steam-distillation",
    unit: 14,
    title: "Steam Distillation — Cinnamon Oil Extraction (Sri Lankan)",
    titleSi: "වාෂ්ප ආසවනය — කුරුඳු තෙල් නිස්සාරණය (ශ්‍රී ලාංකීය)",
    titleTa: "நீராவி வடிகட்டல் — இலவங்கப்பட்டை எண்ணெய் பிரித்தெடுத்தல்",
    description:
      "Sri Lanka produces 90% of the world's true cinnamon (Cinnamomum verum). Extract the essential oil from local bark using steam distillation. See the oil layer separate in the collection flask.",
    difficulty: "Medium",
    priority: "P1",
    status: "Planned",
  },
  {
    id: "exp-43",
    slug: "biodiesel-preparation",
    unit: 14,
    title: "Preparation of Biodiesel",
    titleSi: "ජෛව ඩීසල් සකස් කිරීම",
    titleTa: "பயோ டீசல் தயாரித்தல்",
    description:
      "Convert vegetable oil to biodiesel by transesterification with methanol and NaOH catalyst. Separate, wash, and test the biofuel produced.",
    difficulty: "Medium",
    priority: "P2",
    status: "Planned",
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getExperimentBySlug(slug: string): ExperimentData | undefined {
  return EXPERIMENTS.find((e) => e.slug === slug);
}

export function getExperimentsByUnit(unit: number): ExperimentData[] {
  return EXPERIMENTS.filter((e) => e.unit === unit);
}

export function getExperimentsByPriority(priority: string): ExperimentData[] {
  return EXPERIMENTS.filter((e) => e.priority === priority);
}

export const UNITS = Array.from(
  new Set(EXPERIMENTS.map((e) => e.unit))
).sort((a, b) => a - b);

export const UNIT_NAMES: Record<number, string> = {
  1: "Unit 01 — Structure of Atom",
  3: "Unit 03 — Solutions",
  4: "Unit 04 — Stoichiometry",
  5: "Unit 05 — Energetics",
  6: "Unit 06 — Chemical Kinetics & Equilibrium / Inorganic",
  7: "Unit 07 — Organic Chemistry I",
  8: "Unit 08 — Organic Chemistry II",
  10: "Unit 10 — Carbonyl Compounds",
  11: "Unit 11 — Nitrogen Compounds",
  12: "Unit 12 — Kinetics",
  13: "Unit 13 — Chemical Equilibrium / Acid-Base",
  14: "Unit 14 — Electrochemistry",
};
