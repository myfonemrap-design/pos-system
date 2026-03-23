import bcrypt from "bcryptjs";

async function main() {
  const password = process.argv[2] || "password";
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
}

main();
