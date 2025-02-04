import http from "http";
import { config, logger } from "@intmax2-claim-aggregator/shared";
import { name } from "../../package.json";

const server = http.createServer((req, res) => {
  if (req.url === "/health-check" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: name,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

export const startHealthCheckServer = async () => {
  return new Promise((resolve) => {
    server.listen(config.PORT, () => {
      logger.info(`Health check server is running on port ${config.PORT}`);
      resolve(true);
    });
  });
};
