import Database from 'better-sqlite3';

const db = new Database('prisma/dev.db');

function cuid() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'c';
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const now = new Date().toISOString();

// Brand 1: The Wandering Bean
const id1 = cuid();
db.prepare(`
  INSERT OR IGNORE INTO Brand (id, name, slug, shopifyStoreUrl, shopifyAccessToken, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  id1,
  'The Wandering Bean',
  'the-wandering-bean',
  'the-wandering-bean-flavored-coffee-co.myshopify.com',
  'shpat_REDACTED',
  now, now
);
console.log('Created: The Wandering Bean');

// Brand 2
const id2 = cuid();
db.prepare(`
  INSERT OR IGNORE INTO Brand (id, name, slug, shopifyStoreUrl, shopifyAccessToken, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  id2,
  '0a17b5 Store',
  '0a17b5',
  '0a17b5.myshopify.com',
  'shpat_REDACTED',
  now, now
);
console.log('Created: 0a17b5 Store');

db.close();
console.log('Seeding complete!');
