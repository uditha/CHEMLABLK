import { PrismaClient, Difficulty, Priority, ExperimentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Experiment Data (All 43 NIE A/L Chemistry Practicals) ───────────────────

const experiments = [
  // Unit 01
  {
    slug: "cathode-rays",
    unit: 1,
    title: "Properties of Cathode Rays (Discharge Tube)",
    titleSi: "කැතෝඩ් රශ්මිවල ගුණ (විසර්ජන නළය)",
    titleTa: "கேதோட் கதிர்களின் பண்புகள் (வெளியேற்று குழாய்)",
    description:
      "Investigate the properties of cathode rays using a discharge tube. Observe the deflection of cathode rays by electric and magnetic fields.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "flame-test",
    unit: 1,
    title: "Flame Tests — Na, K, Li, Ca, Sr, Ba, Cu",
    titleSi: "ජ්වාලා පරීක්ෂණ — Na, K, Li, Ca, Sr, Ba, Cu",
    titleTa: "சுடர் சோதனைகள் — Na, K, Li, Ca, Sr, Ba, Cu",
    description:
      "Identify metal ions by the characteristic colours they produce in a flame. Use a nichrome wire loop to introduce metal salts into a Bunsen burner flame.",
    difficulty: Difficulty.Easy,
    priority: Priority.P1,
    status: ExperimentStatus.Built,
  },
  // Unit 03
  {
    slug: "standard-solution-na2co3",
    unit: 3,
    title: "Preparation of Standard Solution of Na₂CO₃",
    titleSi: "Na₂CO₃ හි සම්මත දිය කිරීම සකස් කිරීම",
    titleTa: "Na₂CO₃ இன் தரமான கரைசல் தயாரித்தல்",
    description:
      "Accurately prepare a standard solution of anhydrous sodium carbonate. Learn volumetric analysis techniques including weighing, dissolving, and making up to volume.",
    difficulty: Difficulty.Easy,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "solution-preparation-dilution",
    unit: 3,
    title: "Preparation of Solutions and Dilution",
    titleSi: "ද්‍රාවණ සකස් කිරීම සහ තනුක කිරීම",
    titleTa: "கரைசல்கள் தயாரித்தல் மற்றும் நீர்த்தல்",
    description:
      "Prepare solutions of known concentration and perform serial dilutions. Understand molarity, molality, and the relationship between concentration and volume.",
    difficulty: Difficulty.Easy,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 04
  {
    slug: "molar-volume-gas-o2",
    unit: 4,
    title: "Molar Volume of Gas — O₂ by Water Displacement",
    titleSi: "වායුවේ මෝල් පරිමාව — ජල විස්ථාපනය මගින් O₂",
    titleTa: "வாயுவின் மோலார் கனவளவு — நீர் இடப்பெயர்வால் O₂",
    description:
      "Determine the molar volume of oxygen gas at room temperature and pressure using the water displacement method. Decompose hydrogen peroxide with MnO₂ catalyst.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "relative-atomic-mass-mg",
    unit: 4,
    title: "Relative Atomic Mass of Mg (Mg + HCl Gas Method)",
    titleSi: "Mg හි සාපේක්ෂ පරමාණුක ස්කන්ධය (Mg + HCl වායු ක්‍රමය)",
    titleTa: "Mg இன் சார்பு அணு நிறை (Mg + HCl வாயு முறை)",
    description:
      "Determine the relative atomic mass of magnesium by reacting a known mass of Mg with excess hydrochloric acid and measuring the volume of hydrogen produced.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 05
  {
    slug: "enthalpy-neutralisation",
    unit: 5,
    title: "Enthalpy of Neutralisation — Strong Acid + Base",
    titleSi: "උදාසීනකරණයේ ශක්‍යතාව — ශක්තිමත් අම්ලය + භාෂ්ම",
    titleTa: "நடுநிலைப்படுத்தலின் என்தால்பி — வலிமையான அமிலம் + காரம்",
    description:
      "Determine the enthalpy of neutralisation of a strong acid (HCl) with a strong base (NaOH) using a simple calorimeter. Apply Hess's Law and understand thermochemistry.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "enthalpy-dissolution",
    unit: 5,
    title: "Enthalpy of Dissolution",
    titleSi: "දිය කිරීමේ ශක්‍යතාව",
    titleTa: "கரைவதன் என்தால்பி",
    description:
      "Measure the enthalpy change when a solid dissolves in water. Compare endothermic and exothermic dissolution processes for different salts.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "validation-hess-law",
    unit: 5,
    title: "Validation of Hess's Law (NaOH Pathways P/Q/R)",
    titleSi: "හෙස්ගේ නියමය සත්‍යාපනය කිරීම (NaOH මාර්ග P/Q/R)",
    titleTa: "ஹெஸ் விதியை சரிபார்த்தல் (NaOH பாதைகள் P/Q/R)",
    description:
      "Verify Hess's Law by measuring the enthalpy changes of three related reactions: NaOH(s) dissolving in water, NaOH(aq) with HCl(aq), and NaOH(s) with HCl(aq).",
    difficulty: Difficulty.Hard,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 06
  {
    slug: "nitrogen-in-air",
    unit: 6,
    title: "Presence of Nitrogen in Air",
    titleSi: "වාතයේ නයිට්‍රජන් ඇතිවීම",
    titleTa: "காற்றில் நைட்ரஜனின் இருப்பு",
    description:
      "Demonstrate the presence of nitrogen in air by removing oxygen using copper and observing the residual gas.",
    difficulty: Difficulty.Easy,
    priority: Priority.P3,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "fe2-determination-kmno4",
    unit: 6,
    title: "Fe²⁺ Determination Using Acidified KMnO₄",
    titleSi: "KMnO₄ භාවිතයෙන් Fe²⁺ තීරණය කිරීම",
    titleTa: "அமிலமயமான KMnO₄ பயன்படுத்தி Fe²⁺ தீர்மானிக்கல்",
    description:
      "Determine the concentration of iron(II) ions in solution by titration with standardised acidified potassium permanganate solution.",
    difficulty: Difficulty.Hard,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "k2c2o4-permanganate-titration",
    unit: 6,
    title: "K₂C₂O₄ Concentration by Permanganate Titration",
    titleSi: "KMnO₄ ටයිට්‍රේෂනය මගින් K₂C₂O₄ සාන්ද්‍රනය",
    titleTa: "KMnO₄ ஆல் தைட்ரேஷன் மூலம் K₂C₂O₄ செறிவு",
    description:
      "Determine the concentration of potassium oxalate solution using acidified potassium permanganate as the oxidising agent.",
    difficulty: Difficulty.Hard,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "allotropes-sulphur",
    unit: 6,
    title: "Preparation of Allotropes of Sulphur (Rhombic/Monoclinic)",
    titleSi: "සල්ෆර් අලොට්‍රොප් සකස් කිරීම (රොම්බික්/මොනොක්ලිනික්)",
    titleTa: "கந்தகத்தின் அலோட்ரோப்கள் தயாரித்தல் (ரோம்பிக்/மோனோக்ளினிக்)",
    description:
      "Prepare and compare the two common allotropes of sulphur: rhombic (alpha) and monoclinic (beta) sulphur, by crystallisation from different solvents.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "preparation-so2-properties",
    unit: 6,
    title: "Preparation of SO₂ and Testing Its Properties",
    titleSi: "SO₂ සකස් කිරීම සහ එහි ගුණ පරීක්ෂා කිරීම",
    titleTa: "SO₂ தயாரித்தல் மற்றும் அதன் பண்புகளை சோதித்தல்",
    description:
      "Prepare sulphur dioxide gas by the reaction of copper with hot concentrated sulphuric acid and test its bleaching, acidic, and reducing properties.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "preparation-cl2-properties",
    unit: 6,
    title: "Preparation of Cl₂ and Testing Its Properties",
    titleSi: "Cl₂ සකස් කිරීම සහ එහි ගුණ පරීක්ෂා කිරීම",
    titleTa: "Cl₂ தயாரித்தல் மற்றும் அதன் பண்புகளை சோதித்தல்",
    description:
      "Prepare chlorine gas from MnO₂ and concentrated HCl and investigate its bleaching, oxidising, and acidic properties.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "cu2-zn2-naoh-nh3",
    unit: 6,
    title: "Cu²⁺ and Zn²⁺ with NaOH(aq) and NH₃(aq)",
    titleSi: "NaOH(aq) සහ NH₃(aq) සමඟ Cu²⁺ සහ Zn²⁺",
    titleTa: "NaOH(aq) மற்றும் NH₃(aq) உடன் Cu²⁺ மற்றும் Zn²⁺",
    description:
      "Investigate the reactions of copper(II) and zinc(II) ions with sodium hydroxide and ammonia solutions, observing precipitate formation and complex ion behaviour.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "salt-analysis-d-block",
    unit: 6,
    title: "ID of Ni²⁺, Fe³⁺, Cu²⁺, Cr³⁺ Using NaOH and NH₃",
    titleSi: "NaOH සහ NH₃ භාවිතා කර Ni²⁺, Fe³⁺, Cu²⁺, Cr³⁺ හඳුනා ගැනීම",
    titleTa: "NaOH மற்றும் NH₃ பயன்படுத்தி Ni²⁺, Fe³⁺, Cu²⁺, Cr³⁺ அடையாளம்",
    description:
      "Systematically identify d-block metal ions (Ni²⁺, Fe³⁺, Cu²⁺, Cr³⁺) using NaOH and NH₃ reagents, observing precipitate colours and solubility in excess.",
    difficulty: Difficulty.Hard,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  // Unit 07
  {
    slug: "functional-group-identification",
    unit: 7,
    title: "Identification of Functional Groups (Organic Tests)",
    titleSi: "ක්‍රියාකාරී කණ්ඩායම් හඳුනා ගැනීම (කාබනික පරීක්ෂණ)",
    titleTa: "செயல்பாட்டு குழுக்களை அடையாளம் காணல் (கரிம சோதனைகள்)",
    description:
      "Perform a systematic series of chemical tests to identify organic functional groups including alkenes, alcohols, aldehydes, ketones, carboxylic acids, and amines.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "paper-chromatography-pigments",
    unit: 7,
    title: "Leaf Pigment Separation by Paper Chromatography",
    titleSi: "කඩදාසි වර්ණාලේඛනය මගින් කොළ වර්ණකය වෙන් කිරීම",
    titleTa: "காகித நிறப்பிரிகை மூலம் இலை நிறமிகளை பிரித்தல்",
    description:
      "Separate the photosynthetic pigments from plant leaves using paper chromatography. Calculate Rf values and identify chlorophylls, xanthophylls, and carotenoids.",
    difficulty: Difficulty.Easy,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 08
  {
    slug: "unsaturation-test-br2-kmno4",
    unit: 8,
    title: "Bromine Water / KMnO₄ Test for Unsaturation (Alkenes)",
    titleSi: "අසංතෘප්තතාව සඳහා Br₂ ජලය / KMnO₄ පරීක්ෂණය (ඇල්කීන්)",
    titleTa: "நிறைவற்ற தன்மைக்கு Br₂ நீர் / KMnO₄ சோதனை (ஆல்க்கீன்கள்)",
    description:
      "Test for the presence of carbon-carbon double bonds in organic compounds using bromine water and acidified potassium permanganate solution.",
    difficulty: Difficulty.Easy,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "halide-identification-organic",
    unit: 8,
    title: "Halide Identification in Organic Compounds (Na Fusion + AgNO₃)",
    titleSi: "කාබනික සංයෝගවල හේලෝජනේෂන් හඳුනා ගැනීම",
    titleTa: "கரிம சேர்மங்களில் ஹாலைட்களை அடையாளம் காணல்",
    description:
      "Detect the presence of halogens (Cl, Br, I) in organic compounds using the sodium fusion test followed by silver nitrate solution to identify the halide ion.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 10
  {
    slug: "tollens-test",
    unit: 10,
    title: "Tollens' Test — Aldehydes vs Ketones",
    titleSi: "ටොලෙන්ස් පරීක්ෂණය — ඇල්ඩිහයිඩ් සහ කීටෝන",
    titleTa: "டோலன்ஸ் சோதனை — ஆல்டிஹைட்கள் மற்றும் கீட்டோன்கள்",
    description:
      "Distinguish between aldehydes and ketones using Tollens' reagent (ammoniacal silver nitrate). Observe the silver mirror reaction characteristic of aldehydes.",
    difficulty: Difficulty.Easy,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "fehlings-test",
    unit: 10,
    title: "Fehling's Test — Aldehydes vs Ketones",
    titleSi: "ෆේලිං පරීක්ෂණය — ඇල්ඩිහයිඩ් සහ කීටෝන",
    titleTa: "ஃபெஹ்லிங் சோதனை — ஆல்டிஹைட்கள் மற்றும் கீட்டோன்கள்",
    description:
      "Use Fehling's solution to distinguish between aldehydes and ketones. Observe the characteristic brick-red precipitate of copper(I) oxide with reducing sugars and aldehydes.",
    difficulty: Difficulty.Easy,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "lucas-test",
    unit: 10,
    title: "Lucas Test — Distinguishing Alcohols (1°/2°/3°)",
    titleSi: "ලූකාස් පරීක්ෂණය — ඇල්කොහෝල් වෙන් කිරීම (1°/2°/3°)",
    titleTa: "லூக்காஸ் சோதனை — ஆல்கஹால்களை வேறுபடுத்துதல் (1°/2°/3°)",
    description:
      "Distinguish primary, secondary, and tertiary alcohols using Lucas reagent (anhydrous ZnCl₂ in concentrated HCl) based on their different reaction rates.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "esterification",
    unit: 10,
    title: "Esterification Reaction",
    titleSi: "එස්ටර් කිරීමේ ප්‍රතික්‍රියාව",
    titleTa: "எஸ்டரிஃபிகேஷன் வினை",
    description:
      "Prepare a simple ester by the condensation reaction between a carboxylic acid and an alcohol in the presence of concentrated sulfuric acid as a catalyst.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "acid-hydrolysis-ester",
    unit: 10,
    title: "Acid Hydrolysis of an Ester",
    titleSi: "එස්ටර් ආම්ලික ජලජෙ‍ෙදනය",
    titleTa: "ஒரு எஸ்டரின் அமில நீராற்பகுப்பு",
    description:
      "Hydrolyse an ester using aqueous acid catalyst and identify the products. Understand the reversible nature of esterification reactions.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "vinegar-back-titration",
    unit: 10,
    title: "% Acetic Acid in Vinegar (Back Titration)",
    titleSi: "ස්ස්‍රාවකයේ ඇසිටික් අම්ල ප්‍රතිශතය (ආපස්සු ටයිට්‍රේෂනය)",
    titleTa: "வினிகரில் அசிட்டிக் அமில % (பின் தைட்ரேஷன்)",
    description:
      "Determine the percentage by mass of acetic acid in vinegar using a back titration technique with sodium hydroxide and hydrochloric acid.",
    difficulty: Difficulty.Hard,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  // Unit 11
  {
    slug: "distinguishing-amines",
    unit: 11,
    title: "Distinguishing 1°/2°/3° Amines",
    titleSi: "1°/2°/3° ඇමීන් වෙන් කිරීම",
    titleTa: "1°/2°/3° அமீன்களை வேறுபடுத்துதல்",
    description:
      "Use chemical tests (Hinsberg test, nitrous acid) to distinguish between primary, secondary, and tertiary amines.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "ninhydrin-test-amino-acids",
    unit: 11,
    title: "Ninhydrin Test for Amino Acids",
    titleSi: "ඇමයිනෝ අම්ල සඳහා නිංහයිඩ්‍රින් පරීක්ෂණය",
    titleTa: "அமினோ அமிலங்களுக்கான நின்ஹைட்ரின் சோதனை",
    description:
      "Use ninhydrin reagent to detect the presence of amino acids in solution. Observe the characteristic purple colour (Ruhemann's purple) produced.",
    difficulty: Difficulty.Easy,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "biuret-xanthoproteic-proteins",
    unit: 11,
    title: "Biuret Test / Xanthoproteic Test for Proteins",
    titleSi: "ප්‍රෝටීන් සඳහා බියුරෙට් / ශාන්තෝප්‍රෝටෙයික් පරීක්ෂණය",
    titleTa: "புரதங்களுக்கான பயூரெட் / சாந்தோப்ரோட்டீக் சோதனை",
    description:
      "Test for the presence of proteins using the biuret test (violet colour with Cu²⁺ in NaOH) and the xanthoproteic test (yellow colour with conc. HNO₃).",
    difficulty: Difficulty.Easy,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 12
  {
    slug: "iodine-clock-reaction",
    unit: 12,
    title: "Rate of Reaction: Effect of Concentration (Iodine Clock)",
    titleSi: "ප්‍රතික්‍රියාවේ වේගය: සාන්ද්‍රනයේ බලපෑම (අයඩින් ඔරලෝසු)",
    titleTa: "வினை வேகம்: செறிவின் விளைவு (அயோடின் கடிகாரம்)",
    description:
      "Investigate the effect of reactant concentration on the rate of reaction using the iodine clock reaction. Experience the dramatic sudden colour change.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "rate-reaction-temperature",
    unit: 12,
    title: "Rate of Reaction: Effect of Temperature",
    titleSi: "ප්‍රතික්‍රියාවේ වේගය: උෂ්ණත්වයේ බලපෑම",
    titleTa: "வினை வேகம்: வெப்பநிலையின் விளைவு",
    description:
      "Study the effect of temperature on the rate of a chemical reaction. Apply the Arrhenius equation to determine activation energy.",
    difficulty: Difficulty.Easy,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "rate-reaction-catalyst",
    unit: 12,
    title: "Rate of Reaction: Effect of Catalyst (H₂O₂ + MnO₂)",
    titleSi: "ප්‍රතික්‍රියාවේ වේගය: උත්ප්‍රේරකයේ බලපෑම",
    titleTa: "வினை வேகம்: வினையூக்கியின் விளைவு",
    description:
      "Investigate the catalytic decomposition of hydrogen peroxide using MnO₂ as a heterogeneous catalyst. Measure oxygen produced as a function of time.",
    difficulty: Difficulty.Easy,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "order-of-reaction",
    unit: 12,
    title: "Determination of Order of Reaction from Experimental Data",
    titleSi: "අත්හදා බැලීමේ දත්ත වලින් ප්‍රතික්‍රියා පිළිවෙල නිර්ණය කිරීම",
    titleTa: "சோதனை தரவிலிருந்து வினையின் வரிசை தீர்மானித்தல்",
    description:
      "Analyse rate data to determine the order of reaction with respect to each reactant. Draw graphs and use the initial rate method.",
    difficulty: Difficulty.Hard,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 13
  {
    slug: "titration-hcl-naoh",
    unit: 13,
    title: "Acid-Base Titration: HCl vs NaOH (Strong/Strong)",
    titleSi: "අම්ල-භාෂ්ම ටයිට්‍රේෂනය: HCl සහ NaOH (ශක්තිමත්/ශක්තිමත්)",
    titleTa: "அமில-காரம் தைட்ரேஷன்: HCl vs NaOH (வலிமையான/வலிமையான)",
    description:
      "Perform a standard acid-base titration between strong acid (HCl) and strong base (NaOH) using phenolphthalein indicator. Plot a titration curve.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "titration-ch3cooh-naoh",
    unit: 13,
    title: "Acid-Base Titration: CH₃COOH vs NaOH (Weak/Strong)",
    titleSi: "අම්ල-භාෂ්ම ටයිට්‍රේෂනය: CH₃COOH සහ NaOH (දුර්වල/ශක්තිමත්)",
    titleTa: "அமில-காரம் தைட்ரேஷன்: CH₃COOH vs NaOH (பலவீனமான/வலிமையான)",
    description:
      "Titrate weak acid (ethanoic acid) against strong base (NaOH). Understand the different pH curve shape compared to strong acid/base titrations.",
    difficulty: Difficulty.Hard,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "buffer-preparation-ph",
    unit: 13,
    title: "Buffer Preparation and pH Testing",
    titleSi: "බෆර් සකස් කිරීම සහ pH පරීක්ෂා කිරීම",
    titleTa: "இடைப்பட்ட கரைசல் தயாரித்தல் மற்றும் pH சோதனை",
    description:
      "Prepare buffer solutions of known pH and test their resistance to pH change on addition of small amounts of acid or base.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "ksp-determination",
    unit: 13,
    title: "Ksp Determination (Precipitation Reactions)",
    titleSi: "Ksp නිර්ණය කිරීම (අවසාදිත ප්‍රතික්‍රියා)",
    titleTa: "Ksp தீர்மானித்தல் (வீழ்படிவு வினைகள்)",
    description:
      "Determine the solubility product constant (Ksp) of a sparingly soluble salt by measuring its solubility and applying the principles of ionic equilibrium.",
    difficulty: Difficulty.Hard,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  // Unit 14
  {
    slug: "electrolysis-cuso4",
    unit: 14,
    title: "Electrolysis of CuSO₄ — Mass Change, Faraday's Law",
    titleSi: "CuSO₄ ගේ විද්‍යුත් විශ්ලේෂණය — ස්කන්ධ වෙනස, ෆැරඩේ නියමය",
    titleTa: "CuSO₄ இன் மின்னாற்பகுப்பு — நிறை மாற்றம், ஃபாரடே விதி",
    description:
      "Electrolyse copper sulphate solution using copper electrodes. Measure mass changes at anode and cathode to verify Faraday's Laws of Electrolysis.",
    difficulty: Difficulty.Hard,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "electrolysis-brine",
    unit: 14,
    title: "Electrolysis of Brine (Products at Electrodes)",
    titleSi: "ලවණ ජලයේ විද්‍යුත් විශ්ලේෂණය (ඉලෙක්ට්‍රෝඩ් හි නිෂ්පාදන)",
    titleTa: "உப்புநீர் மின்னாற்பகுப்பு (மின்முனைகளில் உற்பத்திகள்)",
    description:
      "Electrolyse concentrated sodium chloride solution (brine) and identify the products — chlorine gas at the anode, hydrogen at the cathode, and NaOH solution.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "galvanic-cell-emf",
    unit: 14,
    title: "Galvanic Cell Construction — Measuring EMF",
    titleSi: "ගැල්වනික් සෛල ඉදිකිරීම — EMF මිනුම",
    titleTa: "கால்வனிக் கலன் கட்டுமானம் — EMF அளவிடல்",
    description:
      "Construct a Daniell cell and other galvanic cells. Measure the EMF and compare with calculated values using the electrochemical series.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
  {
    slug: "cinnamon-steam-distillation",
    unit: 14,
    title: "Steam Distillation — Cinnamon Oil Extraction (Sri Lankan)",
    titleSi: "වාෂ්ප ආසවනය — කුරුඳු තෙල් නිස්සාරණය (ශ්‍රී ලාංකීය)",
    titleTa: "நீராவி வடிகட்டல் — இலவங்கப்பட்டை எண்ணெய் பிரித்தெடுத்தல் (இலங்கை)",
    description:
      "Extract essential oil from Sri Lankan cinnamon using steam distillation. Experience a unique local context while learning about immiscible liquid distillation.",
    difficulty: Difficulty.Medium,
    priority: Priority.P1,
    status: ExperimentStatus.Next,
  },
  {
    slug: "biodiesel-preparation",
    unit: 14,
    title: "Preparation of Biodiesel",
    titleSi: "ජෛව ඩීසල් සකස් කිරීම",
    titleTa: "பயோ டீசல் தயாரித்தல்",
    description:
      "Prepare biodiesel from vegetable oil via transesterification with methanol and sodium hydroxide catalyst. Test the fuel properties of the product.",
    difficulty: Difficulty.Medium,
    priority: Priority.P2,
    status: ExperimentStatus.Planned,
  },
];

// ─── Quiz Questions for P1 Experiments ────────────────────────────────────────

const quizQuestions: Record<
  string,
  Array<{
    questionText: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    year?: number;
    difficulty: Difficulty;
  }>
> = {
  "flame-test": [
    {
      questionText:
        "Which metal ion produces a characteristic golden-yellow colour in the flame test?",
      options: ["Potassium (K⁺)", "Sodium (Na⁺)", "Calcium (Ca²⁺)", "Lithium (Li⁺)"],
      correctAnswer: 1,
      explanation:
        "Sodium (Na⁺) produces an intense golden-yellow flame due to the 3p → 3s electronic transition emitting light at 589 nm (sodium D-lines). This is so intense it can mask other colours.",
      year: 2019,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "A student performing a flame test observes a lilac/violet flame. Which ion is most likely present?",
      options: ["Lithium", "Barium", "Potassium", "Strontium"],
      correctAnswer: 2,
      explanation:
        "Potassium (K⁺) gives a characteristic lilac/violet colour in the flame test. The colour is due to emission at 766 nm and 770 nm. It can appear lilac when viewed through cobalt blue glass to filter out any sodium contamination.",
      year: 2021,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "In the flame test, why must the nichrome wire loop be cleaned thoroughly between each test?",
      options: [
        "To prevent the wire from melting in the flame",
        "To avoid contamination from previous tests, especially sodium",
        "To cool the wire down faster",
        "To remove oxidation that forms on the wire surface",
      ],
      correctAnswer: 1,
      explanation:
        "The wire must be cleaned (by dipping in conc. HCl and burning in the flame until no colour is imparted) to prevent contamination. Sodium contamination is particularly problematic as its golden-yellow colour is extremely intense and will mask other, weaker colours.",
      year: 2022,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "Which of the following metals produces a brick-red/crimson flame in the flame test?",
      options: ["Barium", "Copper", "Strontium", "Lithium"],
      correctAnswer: 2,
      explanation:
        "Strontium (Sr²⁺) produces a crimson/brick-red flame. This is distinct from lithium which gives a bright crimson-red, and calcium which gives a brick-orange. Strontium compounds are used in red distress flares and fireworks.",
      year: 2020,
      difficulty: Difficulty.Medium,
    },
    {
      questionText:
        "A compound gives a green flame test. Which ion could be responsible?",
      options: ["Sodium (Na⁺)", "Barium (Ba²⁺)", "Lithium (Li⁺)", "Calcium (Ca²⁺)"],
      correctAnswer: 1,
      explanation:
        "Barium (Ba²⁺) produces a pale green/apple-green flame. Copper also gives a blue-green flame. Of the options given, only barium gives a green flame. Green fireworks are made using barium compounds.",
      difficulty: Difficulty.Medium,
    },
    {
      questionText:
        "In the flame test, why do different metal ions produce different flame colours?",
      options: [
        "Different metals have different melting points",
        "Excited electrons fall back to lower energy levels, emitting photons of specific wavelengths",
        "Different metals react differently with the oxygen in the flame",
        "The ionic radii of different metals affects how they scatter light",
      ],
      correctAnswer: 1,
      explanation:
        "The heat of the Bunsen flame gives energy to the metal's electrons, exciting them to higher energy levels. When these electrons fall back to their ground state, they emit photons with energy equal to the difference between the energy levels. Different elements have different energy level spacings, so they emit light at different specific wavelengths (colours).",
      year: 2018,
      difficulty: Difficulty.Hard,
    },
    {
      questionText:
        "Lithium produces a bright crimson-red flame. What wavelength range does this correspond to?",
      options: [
        "400–450 nm (violet region)",
        "500–550 nm (green region)",
        "620–680 nm (red region)",
        "750–800 nm (near infrared)",
      ],
      correctAnswer: 2,
      explanation:
        "Red light falls in the 620–680 nm range of the visible spectrum. Lithium's main emission line is at 670.8 nm (a bright red), which accounts for its characteristic crimson-red flame colour.",
      difficulty: Difficulty.Hard,
    },
  ],
  "enthalpy-neutralisation": [
    {
      questionText:
        "In the enthalpy of neutralisation experiment, why is an insulated container (polystyrene cup) used instead of a glass beaker?",
      options: [
        "Glass would react with the HCl acid",
        "To minimise heat loss to the surroundings for more accurate results",
        "Polystyrene is transparent so changes can be observed",
        "Glass containers cannot measure temperature accurately",
      ],
      correctAnswer: 1,
      explanation:
        "A polystyrene (expanded polystyrene foam) cup is used as an improvised calorimeter because it is a poor conductor of heat. This minimises heat exchange with the surroundings, giving a more accurate measurement of the temperature change due solely to the neutralisation reaction.",
      year: 2019,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "The standard enthalpy of neutralisation for a strong acid reacting with a strong base is approximately:",
      options: ["-57 kJ mol⁻¹", "+57 kJ mol⁻¹", "-115 kJ mol⁻¹", "-28 kJ mol⁻¹"],
      correctAnswer: 0,
      explanation:
        "The standard enthalpy of neutralisation of a strong acid with a strong base is approximately −57.1 kJ mol⁻¹. This value is essentially constant for all strong acid + strong base combinations because the net ionic equation is always: H⁺(aq) + OH⁻(aq) → H₂O(l).",
      difficulty: Difficulty.Medium,
    },
    {
      questionText:
        "Why is the enthalpy of neutralisation of a weak acid with a strong base less exothermic than that of a strong acid with a strong base?",
      options: [
        "Weak acids release less heat because they are dilute",
        "Some energy is used in the ionisation of the weak acid, reducing the overall exothermicity",
        "The reaction is slower for weak acids",
        "Weak acids have higher molecular masses",
      ],
      correctAnswer: 1,
      explanation:
        "Weak acids are only partially ionised. The full neutralisation requires complete ionisation of the weak acid, which is an endothermic process. This endothermic ionisation step reduces the net exothermic heat released, so the enthalpy of neutralisation is less negative (around -50 kJ mol⁻¹ rather than -57 kJ mol⁻¹).",
      year: 2022,
      difficulty: Difficulty.Hard,
    },
  ],
  "fe2-determination-kmno4": [
    {
      questionText:
        "In the titration of Fe²⁺ with KMnO₄, why is dilute sulphuric acid added to the solution being titrated?",
      options: [
        "To dissolve the iron(II) sulphate",
        "To provide an acidic medium for the permanganate to work as an oxidising agent",
        "To prevent precipitation of iron hydroxide",
        "To adjust the colour of the solution",
      ],
      correctAnswer: 1,
      explanation:
        "Acidified (H₂SO₄) conditions are essential for KMnO₄ to function as an oxidising agent. In acidic solution, MnO₄⁻ is reduced to Mn²⁺ (colourless), which is the correct half-reaction. In neutral or alkaline conditions, MnO₂ (brown precipitate) forms instead, giving different stoichiometry and masking the endpoint.",
      difficulty: Difficulty.Medium,
    },
    {
      questionText:
        "In the Fe²⁺/KMnO₄ titration, how is the endpoint detected?",
      options: [
        "Using phenolphthalein indicator — colour changes from colourless to pink",
        "The solution turns from pale green to orange",
        "The first permanent pink/pale purple colour that persists for 30 seconds",
        "A pH meter shows the equivalence point",
      ],
      correctAnswer: 2,
      explanation:
        "No external indicator is needed — KMnO₄ acts as its own indicator. The endpoint is the first permanent faint pink or pale purple colour that persists for at least 30 seconds. Before the endpoint, the purple KMnO₄ is immediately decolourised by excess Fe²⁺. At the endpoint, one drop of KMnO₄ is in excess and the colour persists.",
      year: 2020,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "The ionic equation for the titration of Fe²⁺ with acidified KMnO₄ is: MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O. If 25.0 cm³ of Fe²⁺ solution required 22.5 cm³ of 0.020 mol dm⁻³ KMnO₄ for complete reaction, what is the concentration of the Fe²⁺ solution?",
      options: [
        "0.018 mol dm⁻³",
        "0.090 mol dm⁻³",
        "0.045 mol dm⁻³",
        "0.180 mol dm⁻³",
      ],
      correctAnswer: 1,
      explanation:
        "Moles of KMnO₄ = 0.020 × 22.5/1000 = 4.5 × 10⁻⁴ mol. From the equation, moles of Fe²⁺ = 5 × moles of KMnO₄ = 5 × 4.5 × 10⁻⁴ = 2.25 × 10⁻³ mol. Concentration of Fe²⁺ = 2.25 × 10⁻³ / (25.0/1000) = 0.090 mol dm⁻³.",
      year: 2021,
      difficulty: Difficulty.Hard,
    },
  ],
  "titration-hcl-naoh": [
    {
      questionText:
        "Which indicator is most appropriate for the titration of strong acid (HCl) with strong base (NaOH)?",
      options: [
        "Methyl orange only",
        "Phenolphthalein only",
        "Either methyl orange or phenolphthalein",
        "Universal indicator",
      ],
      correctAnswer: 2,
      explanation:
        "For a strong acid/strong base titration, the equivalence point pH is exactly 7, and the pH change at the endpoint is very sharp (from about pH 4 to pH 10 with just one drop). Both methyl orange (changes 3.1–4.4) and phenolphthalein (changes 8.3–10.0) fall within this steep portion, so either can be used.",
      difficulty: Difficulty.Medium,
    },
    {
      questionText:
        "When using a burette, the meniscus reading should be taken from:",
      options: [
        "The top of the meniscus (for all solutions)",
        "The bottom of the meniscus for colourless/light solutions, top for dark solutions like KMnO₄",
        "The middle of the meniscus",
        "It does not matter as long as readings are consistent",
      ],
      correctAnswer: 1,
      explanation:
        "For colourless or lightly coloured solutions, you read from the bottom of the meniscus to avoid parallax error. For deeply coloured solutions like KMnO₄ (purple), the meniscus is not visible, so you read from the top of the liquid. Consistency is essential — always use the same reference point for start and finish readings.",
      year: 2018,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "What is the purpose of the titre value in a titration experiment?",
      options: [
        "The approximate volume used in the rough titration",
        "The average volume of titrant used calculated from concordant titres",
        "The maximum volume of burette reading",
        "The volume of solution in the conical flask",
      ],
      correctAnswer: 1,
      explanation:
        "The titre is the volume of titrant used in each titration. Concordant titres are titrations that agree within 0.10 cm³ of each other. The average of concordant titres (excluding the rough titration) gives the accurate titre used in calculations.",
      difficulty: Difficulty.Easy,
    },
  ],
  "iodine-clock-reaction": [
    {
      questionText:
        "In the iodine clock reaction, what causes the sudden colour change from colourless to dark blue-black?",
      options: [
        "The iodate ions react with the starch directly",
        "When the thiosulphate is consumed, free iodine accumulates and reacts with starch",
        "The solution reaches a critical pH",
        "The temperature drops below a critical point",
      ],
      correctAnswer: 1,
      explanation:
        "The thiosulphate (S₂O₃²⁻) acts as a scavenger, immediately converting any I₂ formed back to I⁻. While thiosulphate is present, no free iodine accumulates. The moment the thiosulphate is completely consumed, the I₂ suddenly accumulates and immediately forms the intense blue-black complex with starch — causing the dramatic sudden colour change.",
      difficulty: Difficulty.Hard,
    },
    {
      questionText:
        "In an iodine clock experiment, doubling the concentration of iodate ions causes the reaction time to halve. What does this tell us about the order with respect to iodate?",
      options: [
        "Zero order",
        "First order",
        "Second order",
        "Cannot be determined from this data alone",
      ],
      correctAnswer: 1,
      explanation:
        "If doubling [IO₃⁻] halves the time (doubles the rate), then rate ∝ [IO₃⁻]¹. The reaction is first order with respect to iodate ions. For each doubling of concentration, the rate doubles — this is characteristic of first-order dependence.",
      year: 2023,
      difficulty: Difficulty.Medium,
    },
    {
      questionText:
        "Why is it important to keep the total volume constant when investigating the effect of concentration in the iodine clock experiment?",
      options: [
        "To ensure the reaction has enough volume to produce a colour change",
        "Changing total volume changes the concentration of all species, making results unreliable",
        "A constant volume ensures constant temperature",
        "It makes the mixing easier and more reproducible",
      ],
      correctAnswer: 1,
      explanation:
        "When investigating one variable (concentration of one reactant), all other variables must be controlled. If the total volume changes, the concentrations of all reagents change proportionally. To keep other concentrations constant while varying one, distilled water is added to make up to a constant total volume.",
      difficulty: Difficulty.Medium,
    },
  ],
  "electrolysis-cuso4": [
    {
      questionText:
        "In the electrolysis of copper sulphate solution using copper electrodes, what happens to the mass of the anode?",
      options: [
        "It increases as copper is deposited from solution",
        "It stays the same as no reaction occurs",
        "It decreases as copper dissolves into solution",
        "It decreases as oxygen is produced at the anode",
      ],
      correctAnswer: 2,
      explanation:
        "At the copper anode, oxidation occurs: Cu(s) → Cu²⁺(aq) + 2e⁻. Copper atoms dissolve from the anode into solution, so the anode loses mass. This is the basis of copper refining — impure copper used as anode, pure copper deposits at cathode.",
      year: 2021,
      difficulty: Difficulty.Easy,
    },
    {
      questionText:
        "According to Faraday's First Law, if 0.635 g of copper is deposited at the cathode, how many coulombs of charge were passed? (Ar Cu = 63.5, F = 96500 C mol⁻¹)",
      options: ["965 C", "1930 C", "3860 C", "482.5 C"],
      correctAnswer: 1,
      explanation:
        "Moles of Cu = 0.635/63.5 = 0.01 mol. Since Cu²⁺ + 2e⁻ → Cu, moles of electrons = 2 × 0.01 = 0.02 mol. Charge = moles of electrons × Faraday = 0.02 × 96500 = 1930 C.",
      year: 2022,
      difficulty: Difficulty.Hard,
    },
    {
      questionText:
        "In the electrolysis of copper sulphate with copper electrodes, the blue colour of the solution:",
      options: [
        "Intensifies over time as more Cu²⁺ forms",
        "Fades to colourless as Cu²⁺ is removed",
        "Stays approximately the same as Cu²⁺ is consumed at cathode and replenished from anode",
        "Changes to green as the sulphate reacts",
      ],
      correctAnswer: 2,
      explanation:
        "With active copper electrodes, the concentration of Cu²⁺ remains approximately constant. The Cu²⁺ discharged at the cathode (Cu²⁺ → Cu) is exactly replaced by Cu²⁺ going into solution at the anode (Cu → Cu²⁺). The blue colour therefore remains constant — this is why copper electrodes are used in industrial copper refining.",
      difficulty: Difficulty.Medium,
    },
  ],
};

// ─── Seed Function ────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding ChemLab LK database...");

  // Create a demo school
  const school = await prisma.school.upsert({
    where: { code: "DEMO-001" },
    update: {},
    create: {
      name: "Ananda College",
      district: "Colombo",
      province: "Western",
      code: "DEMO-001",
    },
  });
  console.log(`✓ School: ${school.name}`);

  // Create a demo teacher
  const teacherPasswordHash = await bcrypt.hash("teacher123", 12);
  const teacher = await prisma.teacher.upsert({
    where: { email: "teacher@chemlab.lk" },
    update: {},
    create: {
      email: "teacher@chemlab.lk",
      name: "Ms. Dilini Perera",
      passwordHash: teacherPasswordHash,
      schoolId: school.id,
    },
  });
  console.log(`✓ Teacher: ${teacher.name}`);

  // Create a demo class
  const cls = await prisma.class.upsert({
    where: { id: "demo-class-001" },
    update: {},
    create: {
      id: "demo-class-001",
      name: "Grade 12 Science A",
      teacherId: teacher.id,
    },
  });
  console.log(`✓ Class: ${cls.name}`);

  // Create a demo student
  const student = await prisma.student.upsert({
    where: { indexNumber: "12A001" },
    update: {},
    create: {
      indexNumber: "12A001",
      name: "Kasun Wijeratne",
      schoolId: school.id,
      classId: cls.id,
      language: "en",
    },
  });
  console.log(`✓ Student: ${student.name}`);

  // Seed all 43 experiments
  console.log("\n🧪 Seeding 43 experiments...");
  for (const exp of experiments) {
    await prisma.experiment.upsert({
      where: { slug: exp.slug },
      update: {
        title: exp.title,
        titleSi: exp.titleSi,
        titleTa: exp.titleTa,
        description: exp.description,
        difficulty: exp.difficulty,
        priority: exp.priority,
        status: exp.status,
      },
      create: exp,
    });
    process.stdout.write(`  ✓ ${exp.title.substring(0, 55)}...\n`);
  }

  // Seed quiz questions
  console.log("\n📝 Seeding quiz questions...");
  for (const [slug, questions] of Object.entries(quizQuestions)) {
    const experiment = await prisma.experiment.findUnique({ where: { slug } });
    if (!experiment) {
      console.warn(`  ⚠ Experiment not found: ${slug}`);
      continue;
    }
    for (const q of questions) {
      await prisma.question.create({
        data: {
          experimentId: experiment.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          year: q.year,
          difficulty: q.difficulty,
        },
      });
    }
    console.log(
      `  ✓ ${questions.length} questions for: ${experiment.title.substring(0, 40)}`
    );
  }

  console.log("\n✅ Seeding complete!");
  console.log("─────────────────────────────────────────");
  console.log("  Demo login credentials:");
  console.log("  Teacher: teacher@chemlab.lk / teacher123");
  console.log("  Student: Index 12A001 (no password required)");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
