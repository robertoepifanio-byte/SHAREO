import { createClient } from "@upstash/redis"
import { readFileSync } from "fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => l.split("=", 2))
)

const redis = new (await import("@upstash/redis")).Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

const keys = await redis.keys("admin-create:*")
console.log("found:", keys)
if (keys.length > 0) {
  await redis.del(...keys)
  console.log("cleared", keys.length, "keys")
} else {
  console.log("no keys to clear")
}
