import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data/store.json');

export class JsonStore {
  constructor(filePath = process.env.DB_PATH || DEFAULT_DB_PATH) {
    this.filePath = path.resolve(filePath);
    this.data = { users: {} };
    this.ready = this.load();
  }

  async load() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.data = JSON.parse(raw);
      if (!this.data.users) this.data.users = {};
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.save();
    }
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
    await fs.rename(tmpPath, this.filePath);
  }

  async getUser(phoneNumber) {
    await this.ready;
    return this.data.users[phoneNumber] || null;
  }

  async upsertUser(phoneNumber, patch) {
    await this.ready;
    const now = new Date().toISOString();
    const existing = this.data.users[phoneNumber] || {
      phoneNumber,
      babyAgeWeeks: null,
      timezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
      lastWakeAtIso: null,
      sleepStartAtIso: null,
      lastNapMinutes: null,
      createdAt: now
    };

    const updated = {
      ...existing,
      ...patch,
      updatedAt: now
    };

    this.data.users[phoneNumber] = updated;
    await this.save();
    return updated;
  }

  async deleteUser(phoneNumber) {
    await this.ready;
    delete this.data.users[phoneNumber];
    await this.save();
  }
}
