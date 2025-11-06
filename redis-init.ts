import * as Redis from "redis";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const redis = Redis.createClient({
	url: process.env.REDIS_URL // looks like this: redis://localhost:REDIS_PORT_NUMBER,
});

redis.on("error", err => {
	console.error("Redis error:", err);
});

const startRedis = (async () => {
	await redis.connect();

	// Note: this line is only if you want to use a separate Redis DB
	await redis.select(1); // connects to DB 1 (run: 'SELECT 1' in Redis-CLI to switch to DB 1)
	console.log(
		chalk.yellowBright("Successfully connected to"),
		chalk.redBright("Redis")
	);
})();

export { startRedis, redis };
