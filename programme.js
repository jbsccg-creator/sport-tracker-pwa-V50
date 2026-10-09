const EXERCISE_LIBRARY = [
  { name: 'Tractions', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 0, restSec: 120, defaultReps: '5' },
  { name: 'Tractions supination', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 0, restSec: 120, defaultReps: '5-8' },
  { name: 'Tractions gilet 10 kg', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 10, restSec: 180, defaultReps: '3-4' },
  { name: 'Dips', kind: 'strength', muscles: ['pectoraux', 'triceps', 'epaules'], bodyweight: true, defaultLoad: 0, restSec: 120, defaultReps: '8-12' },
  { name: 'Dips gilet 10 kg', kind: 'strength', muscles: ['pectoraux', 'triceps', 'epaules'], bodyweight: true, defaultLoad: 10, restSec: 150, defaultReps: '4-6' },
  { name: 'Pompes', kind: 'strength', muscles: ['pectoraux', 'triceps', 'gainage'], bodyweight: true, defaultLoad: 0, restSec: 90, defaultReps: '20' },
  { name: 'Pompes gilet 10 kg', kind: 'strength', muscles: ['pectoraux', 'triceps', 'gainage'], bodyweight: true, defaultLoad: 10, restSec: 90, defaultReps: '10' },
  { name: 'Pompes claquées', kind: 'strength', muscles: ['pectoraux', 'triceps', 'epaules'], bodyweight: true, defaultLoad: 0, restSec: 90, defaultReps: '5' },
  { name: 'Pike push-ups', kind: 'strength', muscles: ['epaules', 'triceps'], bodyweight: true, defaultLoad: 0, restSec: 75, defaultReps: '8-12' },
  { name: 'Rowing kettlebell 24 kg', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '10-12/côté' },
  { name: 'Rowing kettlebell 16 kg', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '15-25/côté' },
  { name: 'Renegade row kettlebell 16 kg', kind: 'strength', muscles: ['dos', 'gainage', 'biceps'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '8/côté' },
  { name: 'Développé militaire kettlebell 24 kg', kind: 'strength', muscles: ['epaules', 'triceps', 'gainage'], bodyweight: false, defaultLoad: 24, restSec: 120, defaultReps: '5/bras' },
  { name: 'Développé militaire kettlebell 16 kg', kind: 'strength', muscles: ['epaules', 'triceps'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '12/bras' },
  { name: 'Push press kettlebell 24 kg', kind: 'strength', muscles: ['epaules', 'triceps', 'jambes'], bodyweight: false, defaultLoad: 24, restSec: 120, defaultReps: '3-5/bras' },
  { name: 'Shrugs kettlebell 24 kg', kind: 'strength', muscles: ['haut du dos', 'epaules'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '10-12' },
  { name: 'Shrugs kettlebell 16 kg', kind: 'strength', muscles: ['haut du dos', 'epaules'], bodyweight: false, defaultLoad: 16, restSec: 60, defaultReps: '15-20' },
  { name: 'High pull kettlebell 16 kg', kind: 'strength', muscles: ['epaules', 'haut du dos', 'dos'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '5-8' },
  { name: 'Élévations latérales kettlebell 8 kg', kind: 'strength', muscles: ['epaules'], bodyweight: false, defaultLoad: 8, restSec: 45, defaultReps: '12-15' },
  { name: 'Goblet squat 24 kg', kind: 'strength', muscles: ['jambes', 'fessiers', 'gainage'], bodyweight: false, defaultLoad: 24, restSec: 90, defaultReps: '8-12' },
  { name: 'Squats poids du corps', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '25-30' },
  { name: 'Squats sautés', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: true, defaultLoad: 0, restSec: 75, defaultReps: '5-8' },
  { name: 'Split squat bulgare gilet 10 kg', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: true, defaultLoad: 10, restSec: 75, defaultReps: '8/jambe' },
  { name: 'Swing 24 kg', kind: 'strength', muscles: ['ischios', 'fessiers', 'dos'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '15' },
  { name: 'Swing 16 kg', kind: 'strength', muscles: ['ischios', 'fessiers', 'dos'], bodyweight: false, defaultLoad: 16, restSec: 60, defaultReps: '20' },
  { name: 'Clean kettlebell 16 kg', kind: 'strength', muscles: ['dos', 'jambes', 'epaules'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '5/bras' },
  { name: 'RDL une jambe 16 kg', kind: 'strength', muscles: ['ischios', 'fessiers'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '10/jambe' },
  { name: 'RDL 24 kg', kind: 'strength', muscles: ['ischios', 'fessiers', 'dos'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '12' },
  { name: 'Good morning kettlebell 16 kg', kind: 'strength', muscles: ['ischios', 'fessiers', 'dos'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '12' },
  { name: 'Fentes arrière gilet 10 kg', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: true, defaultLoad: 10, restSec: 75, defaultReps: '10/jambe' },
  { name: 'Step-up gilet 10 kg', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: true, defaultLoad: 10, restSec: 75, defaultReps: '10/jambe' },
  { name: 'Mollets debout', kind: 'strength', muscles: ['jambes'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '15-20' },
  { name: 'Mollets genoux fléchis', kind: 'strength', muscles: ['mollets', 'jambes'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '15-20', hint: 'Soléaire : genoux pliés, montée lente' },
  { name: 'Tibialis raises', kind: 'strength', muscles: ['jambes'], bodyweight: true, defaultLoad: 0, restSec: 30, defaultReps: '15-20', hint: 'Dos au mur, relever les pointes de pieds' },
  { name: 'Leg curl glissé', kind: 'strength', muscles: ['ischios', 'fessiers'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '8-12', hint: 'Sur sliders ou serviette, bassin haut' },
  { name: 'Rotation externe élastique', kind: 'strength', muscles: ['epaules'], bodyweight: true, defaultLoad: 0, restSec: 30, defaultReps: '12-15', hint: 'Coude au corps, sans douleur' },
  { name: 'Wall slides', kind: 'mobility', muscles: ['epaules', 'haut du dos'], bodyweight: true, defaultLoad: 0, restSec: 20, defaultReps: '10', hint: 'Dos au mur, glisser les bras sans décoller' },
  { timed: true, name: 'Corde à sauter', kind: 'strength', muscles: ['mollets', 'jambes'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '30 s', hint: 'Rebond léger sur l\'avant du pied' },
  { name: 'Suitcase carry kettlebell 24 kg', kind: 'strength', muscles: ['gainage', 'haut du dos', 'avant-bras'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '30 m/côté' },
  { name: 'Farmer carry kettlebell 24 kg', kind: 'strength', muscles: ['gainage', 'haut du dos', 'avant-bras'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '40 m' },
  { name: 'Halo kettlebell 8 kg', kind: 'mobility', muscles: ['epaules', 'haut du dos'], bodyweight: false, defaultLoad: 8, restSec: 30, defaultReps: '10/sens' },
  { name: 'Y-T-W au sol', kind: 'mobility', muscles: ['haut du dos', 'epaules'], bodyweight: false, defaultLoad: 0, restSec: 30, defaultReps: '8' },
  { name: 'Scapular push-ups', kind: 'mobility', muscles: ['haut du dos', 'gainage'], bodyweight: true, defaultLoad: 0, restSec: 30, defaultReps: '15' },
  { name: 'Reverse snow angels', kind: 'mobility', muscles: ['haut du dos'], bodyweight: false, defaultLoad: 0, restSec: 30, defaultReps: '10' },
  { timed: true, name: 'Dead hang actif', kind: 'mobility', muscles: ['dos', 'epaules'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '30 s' },
  { timed: true, name: 'Planche', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '1 min' },
  { timed: true, name: 'Hollow hold', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '20-30 s' },
  { timed: true, name: 'The hundred (Pilates)', kind: 'mobility', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '30-45 s' },
  { name: 'Swimming au sol (Pilates)', kind: 'mobility', muscles: ['dos', 'gainage', 'fessiers'], bodyweight: true, defaultLoad: 0, restSec: 30, defaultReps: '10/côté' },
  { name: 'Roll-up (Pilates)', kind: 'mobility', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 30, defaultReps: '6-8' },
  { timed: true, name: 'Chien tête en bas (yoga)', kind: 'mobility', muscles: ['dos', 'ischios', 'epaules'], bodyweight: true, defaultLoad: 0, restSec: 20, defaultReps: '45 s' },
  { timed: true, name: 'Posture du guerrier (yoga)', kind: 'mobility', muscles: ['jambes', 'gainage'], bodyweight: true, defaultLoad: 0, restSec: 20, defaultReps: '30 s/côté' },
  { timed: true, name: 'Posture du pigeon (yoga)', kind: 'mobility', muscles: ['hanches', 'fessiers'], bodyweight: true, defaultLoad: 0, restSec: 20, defaultReps: '45 s/côté' },
  { timed: true, name: 'Étirement ischios au sol', kind: 'mobility', muscles: ['ischios'], bodyweight: true, defaultLoad: 0, restSec: 15, defaultReps: '40 s/côté' },
  { timed: true, name: 'Étirement hanches fente basse', kind: 'mobility', muscles: ['hanches', 'jambes'], bodyweight: true, defaultLoad: 0, restSec: 15, defaultReps: '40 s/côté' },
  { name: 'Dead bug', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '10/côté' },
  { name: 'Mountain climbers lents', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '12/côté' },
  { name: 'Pallof press élastique', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '10/côté' },
  { name: 'Relevés de jambes suspendu', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '8-12' },
  { name: 'Bird dog', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 30, defaultReps: '8/côté' },
  { name: 'Windmill kettlebell 8 kg', kind: 'strength', muscles: ['gainage', 'epaules'], bodyweight: false, defaultLoad: 8, restSec: 60, defaultReps: '6/côté' },
  { name: 'Extension triceps kettlebell 8 kg', kind: 'strength', muscles: ['triceps'], bodyweight: false, defaultLoad: 8, restSec: 60, defaultReps: '12/bras' },
  { name: 'Curl kettlebell 8 kg', kind: 'strength', muscles: ['biceps', 'avant-bras'], bodyweight: false, defaultLoad: 8, restSec: 60, defaultReps: '12/bras' },
  { name: 'Curl kettlebell 16 kg', kind: 'strength', muscles: ['biceps', 'avant-bras'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '8 (2 mains)' },
  { name: 'Curl élastique', kind: 'strength', muscles: ['biceps'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '15' },
  { name: 'Extension triceps kettlebell 16 kg', kind: 'strength', muscles: ['triceps'], bodyweight: false, defaultLoad: 16, restSec: 75, defaultReps: '8' },
  { name: 'Pompes prise serrée', kind: 'strength', muscles: ['triceps', 'pectoraux', 'gainage'], bodyweight: true, defaultLoad: 0, restSec: 75, defaultReps: '10-15' },
  { timed: true, name: 'Planche latérale', kind: 'strength', muscles: ['gainage'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '45 s/côté' },
  { name: 'Around the world kettlebell 8 kg', kind: 'strength', muscles: ['epaules', 'gainage'], bodyweight: false, defaultLoad: 8, restSec: 45, defaultReps: '10/sens' },
  { name: 'Around the world kettlebell 16 kg', kind: 'strength', muscles: ['epaules', 'gainage'], bodyweight: false, defaultLoad: 16, restSec: 60, defaultReps: '8/sens' },
  { name: 'Windmill kettlebell 16 kg', kind: 'strength', muscles: ['gainage', 'epaules'], bodyweight: false, defaultLoad: 16, restSec: 60, defaultReps: '5/côté' },
  { name: 'Turkish get-up kettlebell 16 kg', kind: 'strength', muscles: ['gainage', 'epaules', 'jambes'], bodyweight: false, defaultLoad: 16, restSec: 90, defaultReps: '3/côté' },
  { name: 'Curl kettlebell 16 kg', kind: 'strength', muscles: ['biceps'], bodyweight: false, defaultLoad: 16, restSec: 60, defaultReps: '12-15' },
  { name: 'Curl kettlebell 24 kg', kind: 'strength', muscles: ['biceps'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '8-10' },
  { name: 'Presse au sol kettlebell 24 kg', kind: 'strength', muscles: ['pectoraux', 'triceps'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '10-12' },
  { name: 'Pull-over kettlebell 16 kg', kind: 'strength', muscles: ['dos', 'pectoraux', 'gainage'], bodyweight: false, defaultLoad: 16, restSec: 60, defaultReps: '12' },
  { name: 'Sumo squat kettlebell 24 kg', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: false, defaultLoad: 24, restSec: 75, defaultReps: '12-15' },
  { name: 'Snatch kettlebell 16 kg', kind: 'strength', muscles: ['epaules', 'dos', 'jambes'], bodyweight: false, defaultLoad: 16, restSec: 90, defaultReps: '5/bras' },
  { name: 'Fentes latérales', kind: 'strength', muscles: ['jambes', 'fessiers'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '10/côté' },
  { name: 'Tirage vers visage élastique', kind: 'strength', muscles: ['haut du dos', 'epaules'], bodyweight: false, defaultLoad: 0, restSec: 45, defaultReps: '15-20' },
  { name: 'Pont fessier une jambe', kind: 'strength', muscles: ['fessiers', 'ischios'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '12/jambe' },
  { name: 'Course libre', kind: 'run', muscles: ['cardio', 'jambes'], bodyweight: false, defaultLoad: 0, restSec: 0, defaultReps: 'distance + temps' },
  { name: 'Vélo libre', kind: 'bike', muscles: ['cardio', 'jambes'], bodyweight: false, defaultLoad: 0, restSec: 0, defaultReps: 'distance + temps' },
  { name: 'Traction australienne', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 0, restSec: 90, defaultReps: '8-12', hint: 'Sous les barres de dips, une barre basse ou une table solide' },
  { name: 'Rowing inversé sous table', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 0, restSec: 90, defaultReps: '8-12' },
  { name: 'Rowing inversé sous table prise supination', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 0, restSec: 75, defaultReps: '8-12' },
  { name: 'Rowing élastique', kind: 'strength', muscles: ['dos', 'biceps'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '12-15' },
  { name: 'Dips sur banc', kind: 'strength', muscles: ['triceps', 'pectoraux'], bodyweight: true, defaultLoad: 0, restSec: 75, defaultReps: '10-15' },
  { name: 'Pompes piquées', kind: 'strength', muscles: ['epaules', 'triceps'], bodyweight: true, defaultLoad: 0, restSec: 75, defaultReps: '6-10' },
  { name: 'Good morning élastique', kind: 'strength', muscles: ['ischios', 'fessiers', 'dos'], bodyweight: true, defaultLoad: 0, restSec: 60, defaultReps: '12-15' },
  { name: 'Pont fessier', kind: 'strength', muscles: ['fessiers', 'ischios'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '12-15' },
  { name: 'Cercles de bras', kind: 'mobility', muscles: ['epaules'], bodyweight: true, defaultLoad: 0, restSec: 20, defaultReps: '15/sens' },
  { name: 'Élévations latérales élastique', kind: 'strength', muscles: ['epaules'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '12-15' },
  { name: 'Shrugs élastique', kind: 'strength', muscles: ['haut du dos'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '15' },
  { name: 'Planche toucher d\'épaule', kind: 'strength', muscles: ['gainage', 'epaules'], bodyweight: true, defaultLoad: 0, restSec: 45, defaultReps: '10/côté' },
];

function progId(name) { return String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
const LESTE_NAMES = { 'Pompes': 'Pompes lestées', 'Tractions': 'Tractions lestées', 'Dips': 'Dips lestés', 'Fentes arrière': 'Fentes arrière lestées' };
/* Un seul exercice par mouvement : « Swing 24 kg » et « Swing 16 kg » deviennent « Swing KB »,
   « Pompes gilet 10 kg » devient « Pompes lestées ». La charge se saisit dans la colonne Charge/Lest. */
function canonicalExerciseName(n) {
  let s = String(n || '').trim();
  if (/\bgilet\b/i.test(s)) { const base = s.replace(/\s*\bgilet\b.*$/i, '').trim(); return LESTE_NAMES[base] || (base + ' lesté'); }
  if (!/\d+(?:[.,]\d+)?\s*kg/i.test(s) || /haltère/i.test(s)) return s;
  const hadKb = /kettlebell|\bKB\b/i.test(s);
  s = s.replace(/\s*\d+(?:[.,]\d+)?\s*kg/ig, '').replace(/\bkettlebell\b/ig, 'KB').replace(/\s{2,}/g, ' ').trim();
  if (!hadKb && !/\bKB\b/.test(s)) s += ' KB';
  return s;
}
function ex(name, sets, reps, target, restSec, kind = 'strength') {
  const found = EXERCISE_LIBRARY.find(e => e.name === name) || {};
  const k = found.kind || kind;
  const canon = canonicalExerciseName(name);
  const o = { name: canon, sets, reps, target, restSec, kind: k, muscles: found.muscles || [], bodyweight: !!found.bodyweight, defaultLoad: found.defaultLoad || 0 };
  if (canon !== name) { o.srcName = name; o.id = progId(name + '-' + k); } // id historique conservé : aucun log perdu
  return o;
}
function mob(name, sets, reps, target, restSec) { return ex(name, sets, reps, target, restSec, 'mobility'); }

/* ===== Blocs d'intensité (3 semaines chacun) ===== */
const BLOCK_KEYS = ['force', 'volume', 'puissance'];
const BLOCK_LABEL = { force: 'Force', volume: 'Volume/Endurance', puissance: 'Puissance' };
const HALO = () => mob('Halo kettlebell 8 kg', 2, '10/sens', 'Échauffement épaules/scapulas', 30);

function upper1(block) {
  if (block === 'force') return [ HALO(),
    ex('Tractions gilet 10 kg', 5, '4', 'Force, 1 rep en réserve', 180),
    ex('Développé militaire kettlebell 24 kg', 4, '5/bras', 'Gainage anti-inclinaison', 120),
    ex('Rowing kettlebell 24 kg', 4, '6/côté', 'Lourd et propre', 90),
    ex('Dips gilet 10 kg', 4, '5', 'Stop si inconfort épaule', 150),
    ex('Shrugs kettlebell 24 kg', 4, '10', 'Montée lente, pause 1 s en haut', 75),
    ex('Planche latérale', 3, '30 s/côté', 'Gainage', 45) ];
  if (block === 'volume') return [ HALO(),
    ex('Tractions', 6, '6', 'Volume, reste 2 reps en réserve', 120),
    ex('Développé militaire kettlebell 16 kg', 4, '12/bras', 'Contrôle, tempo régulier', 75),
    ex('Rowing kettlebell 16 kg', 4, '15/côté', 'Endurance dos', 60),
    ex('Dips', 4, '12', 'Sans échec', 90),
    ex('Élévations latérales kettlebell 8 kg', 3, '15', 'Épaules, léger et strict', 45),
    ex('Planche', 3, '1 min', 'Gainage', 45) ];
  return [ HALO(),
    ex('Tractions', 5, '3', 'Explosif, tirer vite vers le haut', 150),
    ex('Push press kettlebell 24 kg', 5, '3/bras', 'Impulsion jambes, gainage', 120),
    ex('Pompes claquées', 5, '5', 'Puissance de poussée', 90),
    ex('Rowing kettlebell 24 kg', 4, '6/côté', 'Tir rapide, contrôle retour', 90),
    ex('High pull kettlebell 16 kg', 5, '5', 'Explosif trapèzes/épaules', 75),
    ex('Planche latérale', 3, '30 s/côté', 'Gainage', 45) ];
}
function upper2(block) {
  if (block === 'force') return [
    ex('Tractions supination', 4, '5', 'Force biceps/dos', 120),
    ex('Dips', 5, '8', 'Volume contrôlé', 120),
    ex('Rowing kettlebell 16 kg', 3, '12/côté', 'Haut du dos', 75),
    ex('Suitcase carry kettlebell 24 kg', 3, '30 m/côté', 'Anti-inclinaison, trapèzes', 75),
    mob('Reverse snow angels', 3, '10', 'Posture omoplates', 30),
    ex('Planche', 3, '1 min', 'Gainage', 45) ];
  if (block === 'volume') return [
    ex('Pompes', 10, '10-15', 'EMOM 10 min', 60),
    ex('Dips', 5, '12-15', 'Endurance, sans échec', 90),
    ex('Rowing kettlebell 16 kg', 3, '20/côté', 'Endurance haut du dos', 60),
    ex('Pike push-ups', 3, '10', 'Épaules au poids du corps', 60),
    ex('Shrugs kettlebell 16 kg', 3, '18', 'Trapèzes, contrôle', 45),
    mob('Reverse snow angels', 3, '12', 'Posture (option élastique : pull-apart)', 30) ];
  return [
    ex('Clean kettlebell 16 kg', 5, '5/bras', 'Explosif, réception souple', 90),
    ex('Renegade row kettlebell 16 kg', 4, '8/côté', 'Anti-rotation + dos', 75),
    ex('Pompes claquées', 4, '6', 'Puissance', 90),
    ex('Développé militaire kettlebell 24 kg', 4, '4/bras', 'Force-vitesse épaules', 120),
    ex('Farmer carry kettlebell 24 kg', 3, '40 m', 'Grip, trapèzes, gainage', 75),
    ex('Planche latérale', 3, '30 s/côté', 'Gainage', 45) ];
}
function legs(block) {
  if (block === 'force') return [
    ex('Goblet squat 24 kg', 5, '6', 'Amplitude propre, lourd', 120),
    ex('RDL 24 kg', 4, '6', 'Dos gainé, hanche', 90),
    ex('Split squat bulgare gilet 10 kg', 3, '8/jambe', 'Stabilité, amplitude', 75),
    ex('Mollets debout', 4, '15', 'Prévention course', 45) ];
  if (block === 'volume') return [
    ex('Squats poids du corps', 4, '25', 'Objectif endurance (vise 80 d\'affilée)', 60),
    ex('Fentes arrière gilet 10 kg', 3, '12/jambe', 'Contrôle genou', 75),
    ex('Swing 16 kg', 6, '20', 'Explosif mais fluide', 60),
    ex('Mollets debout', 4, '20', 'Prévention course', 45) ];
  return [
    ex('Squats sautés', 5, '5', 'Sauts explosifs, réception souple', 90),
    ex('Swing 24 kg', 6, '12', 'Puissance hanche', 75),
    ex('Goblet squat 24 kg', 4, '5', 'Concentrique explosif', 90),
    ex('Mollets debout', 4, '15', 'Prévention course', 45) ];
}

/* ===== Jours cardio / repos (indépendants du bloc) ===== */
const REST = () => ({ name: 'Dimanche', title: 'Repos', objective: 'Repos complet si la sortie longue a été faite samedi.', exercises: [ mob('Y-T-W au sol', 1, '8 min', 'Routine douce optionnelle', 0) ] });
function footingA() { return [ ex('Course libre', 1, '40-55 min', 'Footing facile, conversation possible', 0, 'run'), ex('Course libre', 6, '100 m', 'Lignes droites relâchées', 60, 'run') ]; }
function bikeForceB() { return [ ex('Vélo libre', 1, '15 min', 'Échauffement progressif', 0, 'bike'), ex('Vélo libre', 6, '5 min', 'Force basse cadence 55-65 rpm', 180, 'bike'), ex('Vélo libre', 1, '10 min', 'Retour au calme', 0, 'bike') ]; }
function A_intervals() { return { name: 'Mardi', title: 'Course intervalles', objective: "Rendre l'allure du 10 km plus naturelle.", exercises: [ ex('Course libre', 1, '15 min', 'Échauffement + 4 accélérations', 0, 'run'), ex('Course libre', 8, '400 m', 'Intervalles 3:50-4:00/km', 75, 'run'), ex('Course libre', 1, '10 min', 'Retour au calme', 0, 'run'), mob('Y-T-W au sol', 2, '8', 'Activation omoplates', 30) ] }; }
function A_bike() { return { name: 'Vendredi', title: 'Vélo sweet spot / VO2', objective: 'Puissance durable, capacité à tenir haut.', exercises: [ ex('Vélo libre', 1, '15 min', 'Échauffement progressif', 0, 'bike'), ex('Vélo libre', 3, '8-20 min', 'Sweet spot ou VO2 selon forme', 240, 'bike'), ex('Vélo libre', 1, '10 min', 'Retour au calme', 0, 'bike'), HALO() ] }; }
function A_long() { return { name: 'Samedi', title: 'Sortie longue course', objective: 'Construire l\'endurance spécifique 10 km.', exercises: [ ex('Course libre', 1, '9-15 km', 'Sortie longue facile selon phase', 0, 'run'), ex('Course libre', 1, '3-5 km', 'Bloc tempo optionnel 4:25 puis 4:15/km', 0, 'run'), mob('Halo kettlebell 8 kg', 1, '20', 'Mobilité retour', 0) ] }; }
function B_threshold() { return { name: 'Mardi', title: 'Course seuil / tempo', objective: 'Tenir vite longtemps, clé du 10 km.', exercises: [ ex('Course libre', 1, '15 min', 'Échauffement + accélérations', 0, 'run'), ex('Course libre', 3, '8-15 min', 'Seuil 4:10-4:20/km', 180, 'run'), ex('Course libre', 1, '10 min', 'Retour au calme', 0, 'run') ] }; }
function B_footingDos() { return { name: 'Mercredi', title: 'Footing facile + routine dos', objective: 'Récupération active et protection des omoplates.', exercises: [ ex('Course libre', 1, '40-55 min', 'Footing facile, terrain souple', 0, 'run'), mob('Scapular push-ups', 3, '15', 'Activation haut du dos', 30), mob('Y-T-W au sol', 3, '8', 'Trapèzes moyens/inférieurs', 30), mob('Dead hang actif', 3, '30 s', 'Stabilité épaule', 45) ] }; }
function B_long() { return { name: 'Samedi', title: 'Sortie vélo longue', objective: 'Tenir vite longtemps : vise ta vitesse objectif (réglable dans Objectifs) sur la durée.', exercises: [ ex('Vélo libre', 1, '1h30-2h30', 'Sortie longue endurance', 0, 'bike'), ex('Vélo libre', 3, '10-25 min', 'Blocs rapides à allure soutenue', 300, 'bike'), mob('Halo kettlebell 8 kg', 1, '20', 'Mobilité retour', 0) ] }; }

/* Semaine B : mêmes schémas, exercices variés (le geste et l'intensité restent, l'exercice change) */
const B_STRENGTH_VARIANTS = {
  force: {
    'Shrugs kettlebell 24 kg': () => ex('High pull kettlebell 16 kg', 4, '6', 'Trapèzes, tir contrôlé sans à-coup', 75),
    'Suitcase carry kettlebell 24 kg': () => ex('Farmer carry kettlebell 24 kg', 3, '40 m', 'Grip, trapèzes, gainage', 75),
    'Split squat bulgare gilet 10 kg': () => ex('Fentes arrière gilet 10 kg', 3, '8/jambe', 'Stabilité, contrôle genou', 75)
  },
  volume: {
    'Élévations latérales kettlebell 8 kg': () => ex('Around the world kettlebell 8 kg', 3, '10/sens', 'Épaules, cercle contrôlé', 45),
    'Pike push-ups': () => ex('Presse au sol kettlebell 24 kg', 3, '12', 'Poussée horizontale, coudes protégés', 75),
    'Shrugs kettlebell 16 kg': () => ex('Tirage vers visage élastique', 3, '15', 'Posture omoplates', 45),
    'Fentes arrière gilet 10 kg': () => ex('Step-up gilet 10 kg', 3, '12/jambe', 'Contrôle genou', 75)
  },
  puissance: {
    'High pull kettlebell 16 kg': () => ex('Snatch kettlebell 16 kg', 5, '4/bras', 'Explosif, trajectoire proche du corps', 90),
    'Farmer carry kettlebell 24 kg': () => ex('Suitcase carry kettlebell 24 kg', 3, '30 m/côté', 'Anti-inclinaison', 75)
  }
};
function buildWeek(type, block) {
  const bl = BLOCK_LABEL[block];
  const days = {};
  days[1] = { name: 'Lundi', title: `Haut du corps 1 · ${bl}`, objective: `Tirage vertical, poussée et épaules — orientation ${bl.toLowerCase()}.`, exercises: upper1(block) };
  days[4] = { name: 'Jeudi', title: `Haut du corps 2 · ${bl}`, objective: `Poussée/tirage complémentaires, trapèzes et gainage — ${bl.toLowerCase()}.`, exercises: upper2(block) };
  days[0] = REST();
  if (type === 'A') {
    days[2] = A_intervals();
    days[3] = { name: 'Mercredi', title: `Footing facile + jambes · ${bl}`, objective: 'Footing facile puis force des jambes sans ruiner la récupération.', exercises: [ ...footingA(), ...legs(block) ] };
    days[5] = A_bike();
    days[6] = A_long();
  } else {
    days[2] = B_threshold();
    // Semaine B : les jambes quittent le vendredi (veille de la sortie vélo longue) pour un module court le mercredi
    const fd = B_footingDos();
    const legsShort = legs(block).slice(0, 3).map(e => Object.assign({}, e, { sets: Math.min(3, Number(e.sets || 3)) }));
    days[3] = { name: 'Mercredi', title: `Footing facile + jambes courtes · ${bl}`, objective: 'Footing facile, module jambes court, puis routine dos : jambes fraîches pour la sortie longue de samedi.', exercises: [ fd.exercises[0], ...legsShort, ...fd.exercises.slice(1) ] };
    days[5] = { name: 'Vendredi', title: `Vélo force basse cadence · ${bl}`, objective: 'Force spécifique vélo, sans séance jambes la veille de la sortie longue.', exercises: [ ...bikeForceB() ] };
    days[6] = B_long();
  }
  if (type === 'B') { const map = B_STRENGTH_VARIANTS[block] || {}; [1, 3, 4, 5].forEach(k => { if (days[k] && days[k].exercises) days[k].exercises = days[k].exercises.map(e => (map[e.name] ? map[e.name]() : e)); }); }
  return { label: `Semaine ${type} · ${bl}`, days };
}

const PROGRAMME = { A: {}, B: {} };
['A', 'B'].forEach(type => BLOCK_KEYS.forEach(block => { PROGRAMME[type][block] = buildWeek(type, block); }));

const DAILY_ROUTINE = [
  { name: 'Cat-cow', target: 'Mobilité colonne', sets: 1, reps: '10 reps', restSec: 15, kind: 'mobility' },
  { name: 'Thread the needle', target: 'Rotation thoracique', sets: 2, reps: '8/côté', restSec: 30, kind: 'mobility' },
  { name: 'Scapular push-ups', target: 'Dentelé antérieur', sets: 2, reps: '15', restSec: 30, kind: 'mobility' },
  { name: 'Y-T-W au sol', target: 'Trapèzes moyens/inférieurs', sets: 2, reps: '6 de chaque', restSec: 30, kind: 'mobility' },
  { name: 'Halo kettlebell 8 kg', target: 'Contrôle épaule', sets: 2, reps: '10/sens', restSec: 30, kind: 'mobility' },
  { name: 'Dead hang actif', target: 'Stabilité scapulaire', sets: 2, reps: '30 s', restSec: 45, kind: 'mobility' },
  { name: 'Respiration allongée', target: 'Relâcher trapèzes', sets: 1, reps: '2 min', restSec: 0, kind: 'mobility' }
];

const TESTS = [
  { key: 'run10k', label: '10 km', unit: 'min', goal: '40:00' },
  { key: 'pullups', label: 'Tractions max', unit: 'reps', goal: '4 x 10 facile' },
  { key: 'pushups', label: 'Pompes max', unit: 'reps', goal: '60' },
  { key: 'squats', label: 'Squats max', unit: 'reps', goal: '80' },
  { key: 'dips', label: 'Dips max', unit: 'reps', goal: '20' },
  { key: 'bike2h', label: 'Vélo 2 h', unit: 'km/h', goal: '> 35 km/h' },
  { key: 'backPain', label: 'Douleur omoplates', unit: '/10', goal: '≤ 2' }
];

/* ===== Séances libres pré-enregistrées (modèles) ===== */
const FREE_TEMPLATES = [
  { id: 'fullbody-kettle', name: 'Full body kettle', exercises: [
    { name: 'Halo kettlebell 8 kg', kind: 'mobility', muscles: ['epaules', 'haut du dos'], bodyweight: false, restSec: 30, sets: [{load:8,reps:20},{load:8,reps:20},{load:8,reps:20}] },
    { name: 'Swing kettlebell', kind: 'strength', muscles: ['ischios','fessiers','dos'], bodyweight: false, restSec: 75, sets: [{load:16,reps:20},{load:24,reps:15},{load:16,reps:20}] },
    { name: 'Tractions supination', kind: 'strength', muscles: ['dos','biceps'], bodyweight: true, restSec: 90, sets: [{load:0,reps:8},{load:0,reps:8},{load:0,reps:8}] },
    { name: 'Goblet squat kettlebell', kind: 'strength', muscles: ['jambes','fessiers'], bodyweight: false, restSec: 90, sets: [{load:16,reps:12},{load:16,reps:12},{load:16,reps:12}] },
    { name: 'Pompes', kind: 'strength', muscles: ['pectoraux','triceps'], bodyweight: true, restSec: 90, sets: [{load:0,reps:20},{load:0,reps:20},{load:0,reps:20}] },
    { name: 'Rowing haltère', kind: 'strength', muscles: ['dos','biceps'], bodyweight: false, restSec: 75, sets: [{load:16,reps:24},{load:16,reps:24},{load:16,reps:24}] },
    { name: 'Presse épaules kettlebell', kind: 'strength', muscles: ['epaules','triceps'], bodyweight: false, restSec: 75, sets: [{load:16,reps:20},{load:16,reps:20},{load:16,reps:20}] },
    { name: 'Soulevé de terre roumain une jambe', kind: 'strength', muscles: ['ischios','fessiers'], bodyweight: false, restSec: 75, sets: [{load:16,reps:22},{load:16,reps:24},{load:16,reps:20}] },
    { name: 'Curl kettlebell', kind: 'strength', muscles: ['biceps'], bodyweight: false, restSec: 60, sets: [{load:24,reps:15},{load:24,reps:15},{load:24,reps:15}] }
  ]},
  { id: 'pull', name: 'Pull', exercises: [
    { name: 'Tractions supination', kind: 'strength', muscles: ['dos','biceps'], bodyweight: true, restSec: 120, sets: [{load:0,reps:8},{load:0,reps:8},{load:0,reps:7},{load:0,reps:5},{load:0,reps:3}] },
    { name: 'Tractions supination (dégressif)', kind: 'strength', muscles: ['dos','biceps'], bodyweight: true, restSec: 90, sets: [{load:0,reps:7},{load:0,reps:6}] },
    { name: 'Rowing haltère', kind: 'strength', muscles: ['dos','biceps'], bodyweight: false, restSec: 75, sets: [{load:16,reps:24},{load:24,reps:16},{load:24,reps:16},{load:16,reps:24}] },
    { name: 'Tirage vers visage', kind: 'strength', muscles: ['haut du dos','epaules'], bodyweight: false, restSec: 60, sets: [{load:15,reps:30},{load:15,reps:30},{load:15,reps:30}] },
    { name: 'Tirage machine convergente', kind: 'strength', muscles: ['dos','biceps'], bodyweight: false, restSec: 75, sets: [{load:35,reps:15},{load:35,reps:15},{load:35,reps:15}] },
    { name: 'Soulevé de terre roumain haltère', kind: 'strength', muscles: ['ischios','fessiers','dos'], bodyweight: false, restSec: 90, sets: [{load:24,reps:15},{load:24,reps:15},{load:24,reps:15},{load:24,reps:20}] },
    { name: 'Écartés épaules élastique', kind: 'strength', muscles: ['haut du dos','epaules'], bodyweight: false, restSec: 45, sets: [{load:0,reps:15},{load:0,reps:15},{load:0,reps:15},{load:0,reps:15}] },
    { name: 'Shrug haltère', kind: 'strength', muscles: ['haut du dos','epaules'], bodyweight: false, restSec: 60, sets: [{load:24,reps:15},{load:24,reps:15},{load:24,reps:15}] }
  ]},
  { id: 'push', name: 'Push', exercises: [
    { name: 'Dips triceps', kind: 'strength', muscles: ['pectoraux','triceps','epaules'], bodyweight: true, restSec: 90, sets: [{load:0,reps:12},{load:0,reps:12},{load:0,reps:12},{load:0,reps:15}] },
    { name: 'Presse épaules kettlebell', kind: 'strength', muscles: ['epaules','triceps'], bodyweight: false, restSec: 75, sets: [{load:16,reps:24},{load:16,reps:22},{load:16,reps:20},{load:16,reps:16}] },
    { name: 'Presse au sol haltère', kind: 'strength', muscles: ['pectoraux','triceps'], bodyweight: false, restSec: 75, sets: [{load:24,reps:12},{load:24,reps:12},{load:24,reps:12},{load:24,reps:12},{load:24,reps:12},{load:24,reps:12},{load:24,reps:12}] },
    { name: 'Écarté incliné haltère', kind: 'strength', muscles: ['pectoraux','epaules'], bodyweight: false, restSec: 60, sets: [{load:8,reps:30},{load:8,reps:30},{load:8,reps:30}] },
    { name: 'Pompes', kind: 'strength', muscles: ['pectoraux','triceps'], bodyweight: true, restSec: 60, sets: [{load:0,reps:15},{load:0,reps:15},{load:0,reps:15}] },
    { name: 'Pompes inclinées', kind: 'strength', muscles: ['pectoraux','triceps'], bodyweight: true, restSec: 60, sets: [{load:0,reps:15},{load:0,reps:15},{load:0,reps:15}] },
    { name: 'Pompes déclinées', kind: 'strength', muscles: ['pectoraux','epaules','triceps'], bodyweight: true, restSec: 60, sets: [{load:0,reps:10},{load:0,reps:6},{load:0,reps:10}] }
  ]},
  { id: 'lower-maison', name: 'Lower maison', exercises: [
    { name: 'Goblet squat kettlebell', kind: 'strength', muscles: ['jambes','fessiers'], bodyweight: false, restSec: 90, sets: [{load:16,reps:20},{load:16,reps:15},{load:16,reps:15}] },
    { name: 'Sumo squat haltère', kind: 'strength', muscles: ['jambes','fessiers'], bodyweight: false, restSec: 90, sets: [{load:16,reps:20},{load:16,reps:15},{load:16,reps:15}] },
    { name: 'Fentes latérales', kind: 'strength', muscles: ['jambes','fessiers'], bodyweight: true, restSec: 75, sets: [{load:0,reps:30},{load:10,reps:30},{load:10,reps:30}] },
    { name: 'Fentes inversées haltère', kind: 'strength', muscles: ['jambes','fessiers'], bodyweight: false, restSec: 75, sets: [{load:10,reps:24},{load:10,reps:24},{load:10,reps:24}] },
    { name: 'Split squat bulgare', kind: 'strength', muscles: ['jambes','fessiers'], bodyweight: false, restSec: 75, sets: [{load:10,reps:16},{load:10,reps:16},{load:10,reps:16}] },
    { name: 'Soulevé de terre haltère', kind: 'strength', muscles: ['ischios','fessiers','dos'], bodyweight: false, restSec: 90, sets: [{load:16,reps:20},{load:16,reps:20},{load:16,reps:20},{load:16,reps:20}] },
    { name: 'Extension mollets debout', kind: 'strength', muscles: ['jambes'], bodyweight: false, restSec: 45, sets: [{load:10,reps:30},{load:10,reps:30},{load:10,reps:30},{load:10,reps:30}] },
    { name: 'Dead hang actif', kind: 'mobility', muscles: ['dos','epaules'], bodyweight: true, restSec: 45, sets: [{load:0,reps:'1 min'}] }
  ]}
];
