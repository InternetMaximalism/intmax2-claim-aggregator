import { randomBytes } from "crypto";
import axios from "axios";
import { PrismaClient, WithdrawalStatus } from "../node_modules/.prisma/withdrawal-client";

const SEED_COUNT = 20;

const getSingleWithdrawalProof = async () => {
  if (!process.env.PROOF_URL) {
    throw new Error(`PROOF_URL is not set`);
  }
  const res = await axios.get<string>(process.env.PROOF_URL);
  return res.data;
};

const getRandomString = (length: number): string => {
  const bytes = randomBytes(length / 2);
  return bytes.toString("hex").slice(0, length);
};

const generateWithdrawalData = async (count: number) => {
  const singleWithdrawalProof = await getSingleWithdrawalProof();

  return Array.from({ length: count }, (_, i) => {
    const pubkey = `0x${(i + 1).toString(16).padStart(64, "0")}`;
    const recipient = `0x${(i + 2).toString(16).padStart(40, "0")}`;

    const statuses = [
      WithdrawalStatus.requested,
      WithdrawalStatus.relayed,
      WithdrawalStatus.success,
      WithdrawalStatus.need_claim,
      WithdrawalStatus.failed,
    ];
    const status = statuses[i % statuses.length];

    return {
      uuid: getRandomString(32),
      status,
      pubkey,
      recipient,
      withdrawalHash: getRandomString(32),
      contractWithdrawal: {
        recipient: `0x${i.toString(16).padStart(40, "0")}`,
        token_index: i,
        amount: (1000000n + BigInt(i)).toString(),
        nullifier: `0x${i.toString(16).padStart(64, "b")}`,
        block_hash: `0x${i.toString(16).padStart(64, "a")}`,
        block_number: i + 1000,
      },
      singleWithdrawalProof: Buffer.from(singleWithdrawalProof),
    };
  });
};

const prisma = new PrismaClient();

const main = async () => {
  const withdrawalData = await generateWithdrawalData(SEED_COUNT);

  await prisma.withdrawal.deleteMany();

  console.log(`Start seeding ${SEED_COUNT} withdrawals...`);

  for (const w of withdrawalData) {
    const withdrawal = await prisma.withdrawal.create({
      data: w,
    });
    console.log(`Created withdrawal with id: ${withdrawal.uuid}`);
  }

  console.log(`Seeding finished.`);
};

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
