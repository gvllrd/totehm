// TOTEHM · higher.boutique · /api/geo
// why : révéler [Make the Lisbon Streets Higher] uniquement pour Lisbonne.
// how : Vercel injecte x-vercel-ip-country sur toute requête servie.
// what : { country, lisbon } — fail-closed côté front (rien à révéler
//        si la réponse n'arrive pas).
export default function handler(req, res) {
  const country = req.headers['x-vercel-ip-country'] || 'other';
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).json({ country, lisbon: country === 'PT' });
}
