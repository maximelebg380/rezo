function cleanFrenchStreetName(rawName) {
  if (!rawName) return "";
  let s = rawName.trim();
  const prefixRegex = /^(Rue|Avenue|Av\.|Boulevard|Bd|Bvd|Allée|Cours|Quai|Chemin|Impasse|Place|Pl\.|Route|Rte|Passage|Voie|Square|Promenade|Montée|Ruelle)\s+(du\s+val\s+de|du|de\s+la|des|de\s+l'|d'|de|la|le|l'|au)?\s*/i;
  s = s.replace(prefixRegex, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getSatisfactionEmoji(score) {
  if (score >= 80) return "😃";
  if (score >= 65) return "🙂";
  if (score >= 50) return "😐";
  if (score >= 35) return "🙁";
  return "😡";
}