const { getProxyAgent } = require("../utils/proxy");
const UserAgent = require("user-agents");
const axios = require("axios");
const { logMessage } = require("../utils/logger");
const { generateAuthToken } = require("../utils/generator");

const AGENTS = {
  AGENT1: {
    id: "deployment_KiMLvUiTydioiHm7PWZ12zJU",
    name: "Professor",
    prompts: ["What is proof of AI", "what is KiteAI"]
  },
  AGENT2: {
    id: "deployment_ByVHjMD6eDb9AdekRIbyuz14",
    name: "Crypto Buddy",
    prompts: ["Top Movers Today", "Price of bitcoin"]
  },
  AGENT3: {
    id: "deployment_OX7sn2D0WvxGUGK8CTqsU5VJ",
    name: "Sherlock",
    prompts: [
      "What do you think of this transaction? 0x252c02bded9a24426219248c9c1b065b752d3cf8bedf4902ed62245ab950895b"
    ]
  }
};

module.exports = class gokiteV2Bot {
  constructor(account, proxy = null, currentNum = 1, total = 1) {
    this.currentNum = currentNum;
    this.total = total;
    this.token = null;
    this.proxy = proxy;
    this.address = account;
    this.axios = axios.create({
      httpsAgent: proxy ? getProxyAgent(proxy) : undefined,
      timeout: 120000,
      headers: {
        "User-Agent": new UserAgent().toString(),
        Origin: "https://testnet.gokite.ai",
        Referer: "https://testnet.gokite.ai/"
      }
    });
  }

  async makeRequest(method, url, config = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.axios({ method, url, ...config });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          await logMessage(this.currentNum, this.total, "Unauthorized (401), re-login...", "warning", this.address);
          this.token = await this.loginUser();
          await logMessage(this.currentNum, this.total, "Re-login successful, retrying...", "process", this.address);
          continue;
        }
        const errorData = error.response ? error.response.data : error.message;
        await logMessage(this.currentNum, this.total, `Request failed: ${error.message}`, "error", this.address);
        await logMessage(this.currentNum, this.total, `Error data: ${JSON.stringify(errorData)}`, "error", this.address);
        await logMessage(this.currentNum, this.total, `Retrying... (${i + 1}/${retries})`, "process", this.address);
        await new Promise(r => setTimeout(r, 12000));
      }
    }
    return null;
  }

  async loginUser() {
    const authorkey = await generateAuthToken(this.address);
    const response = await this.loginAccount(authorkey);
    if (response) return response.data.data.access_token;
    return null;
  }

  async loginAccount(author) {
    await logMessage(this.currentNum, this.total, `Trying Login Account...`, "process", this.address);
    const headers = { authorization: author, "Content-Type": "application/json" };
    const payload = { eoa: this.address };
    try {
      const response = await this.makeRequest("POST", "https://neo.prod.gokite.ai/v2/signin", {
        data: payload, headers
      });
      if (response?.data.error === "") {
        await logMessage(this.currentNum, this.total, "Login Success", "success", this.address);
        this.token = response.data.data.access_token;
        return response.data;
      }
      return null;
    } catch (error) {
      await logMessage(this.currentNum, this.total, `Login failed: ${error.message}`, "error", this.address);
      return null;
    }
  }

  async chatWithAgent(serviceId, message, agentName) {
    try {
      await logMessage(this.currentNum, this.total, `Chatting with ${agentName}...`, "process", this.address);
      const headers = { authorization: `Bearer ${this.token}`, "Content-Type": "application/json" };
      const payload = {
        service_id: serviceId,
        subnet: "kite_ai_labs",
        stream: true,
        body: { stream: true, message }
      };

      const response = await this.makeRequest(
        "POST",
        "https://ozone-point-system.prod.gokite.ai/agent/inference",
        { data: payload, headers, responseType: "stream" }
      );

      if (!response || !response.data) {
        await logMessage(this.currentNum, this.total, `Failed to get response from ${serviceId}`, "error", this.address);
        return null;
      }

      return new Promise((resolve) => {
        let result = "";
        response.data.on("data", (chunk) => {
          const lines = chunk.toString().split("\n").filter(l => l.trim());
          for (const line of lines) {
            try {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                if (jsonStr === "[DONE]") continue;
                const data = JSON.parse(jsonStr);
                if (data.choices && data.choices[0].delta.content) {
                  result += data.choices[0].delta.content;
                }
              }
            } catch (e) {
              // parsing error — tidak fatal
            }
          }
        });
        response.data.on("end", async () => {
          const trimmed = result.trim();
          const preview = trimmed.length > 50 ? trimmed.slice(0,50) + "..." : trimmed;
          await logMessage(this.currentNum, this.total, `${agentName} responded: "${preview}"`, "success", this.address);
          resolve(trimmed);
        });
      });
    } catch (error) {
      await logMessage(this.currentNum, this.total, `Chat failed: ${error.message}`, "error", this.address);
      return null;
    }
  }

  async submitReceipt(serviceId, inputMessage, outputMessage, agentName) {
    try {
      await logMessage(this.currentNum, this.total, `Submitting receipt for ${agentName}...`, "process", this.address);
      const headers = { authorization: `Bearer ${this.token}`, "Content-Type": "application/json" };
      const payload = {
        address: this.address,
        service_id: serviceId,
        input: [{ type: "text/plain", value: inputMessage }],
        output: [{ type: "text/plain", value: outputMessage }]
      };

      const response = await this.makeRequest(
        "POST",
        "https://neo.prod.gokite.ai/v2/submit_receipt",
        { data: payload, headers }
      );
      if (response?.data.error === "") {
        await logMessage(this.currentNum, this.total, `Receipt OK for ${agentName}`, "success", this.address);
        return true;
      } else {
        await logMessage(this.currentNum, this.total, `Receipt failed: ${response?.data.error || "Unknown"}`, "error", this.address);
        return false;
      }
    } catch (error) {
      await logMessage(this.currentNum, this.total, `Submit receipt failed: ${error.message}`, "error", this.address);
      return false;
    }
  }

  async chatRepeat() {
    try {
      let successCount = 0;
      for (const agent of Object.values(AGENTS)) {
        await logMessage(this.currentNum, this.total, `Start ${agent.name}...`, "process", this.address);
        for (const prompt of agent.prompts) {
          await new Promise(r => setTimeout(r, 2000));
          await logMessage(this.currentNum, this.total, `Prompt: "${prompt}"`, "info", this.address);
          const response = await this.chatWithAgent(agent.id, prompt, agent.name);
          if (!response) continue;
          const ok = await this.submitReceipt(agent.id, prompt, response, agent.name);
          if (ok) successCount++;
          await new Promise(r => setTimeout(r, 3000));
        }
        await logMessage(this.currentNum, this.total, `Done ${agent.name}`, "success", this.address);
      }
      await logMessage(this.currentNum, this.total, `Session completed with ${successCount} successes`, "success", this.address);
      return successCount > 0;
    } catch (error) {
      await logMessage(this.currentNum, this.total, `Chat repeat failed: ${error.message}`, "error", this.address);
      return false;
    }
  }

  async getTotalPoints() {
    await logMessage(this.currentNum, this.total, `Getting User Data...`, "process", this.address);
    const headers = { authorization: `Bearer ${this.token}`, "Content-Type": "application/json" };
    try {
      const response = await this.makeRequest("GET", "https://ozone-point-system.prod.gokite.ai/me", { headers });
      if (response?.data.error === "") {
        await logMessage(this.currentNum, this.total, "Get User Data Success", "success", this.address);
        return response.data.data.profile.total_xp_points;
      } else {
        await logMessage(this.currentNum, this.total, `Failed get data: ${response.data.error}`, "error", this.address);
        return null;
      }
    } catch (error) {
      await logMessage(this.currentNum, this.total, `Get data failed: ${error.message}`, "error", this.address);
      return null;
    }
  }

  async processKeepAlive() {
    try {
      if (!this.token) {
        const authorkey = await generateAuthToken(this.address);
        await this.loginAccount(authorkey);
      }
      const chatRepeat = await this.chatRepeat();
      const pointsXp = await this.getTotalPoints();
      return { points: pointsXp, keepAlive: chatRepeat };
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await logMessage(this.currentNum, this.total, "Token expired, login again...", "warning", this.address);
        await this.loginUser();
        return this.processKeepAlive();
      }
      await logMessage(this.currentNum, this.total, `Failed process: ${error.message}`, "error", this.address);
      throw error;
    }
  }
};
