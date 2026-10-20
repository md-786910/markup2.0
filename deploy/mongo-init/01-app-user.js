// Runs once on first start (empty data volume). Creates the least-privilege
// user the API connects with: readWrite on the app database only.
const dbName = process.env.MONGO_APP_DB || 'markup_mvp';
db.getSiblingDB(dbName).createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: dbName }],
});
print(`Created app user for database ${dbName}`);
