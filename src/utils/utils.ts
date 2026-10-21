import { sendErrorMessage } from "./logger.js";
import { client } from "../index.js";

import { load } from 'js-yaml';
import { MessageFlags } from 'discord.js';
import fs from 'fs';

const utils = {

  async loadYaml(filePath: string) {
    try {
      return load(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      sendErrorMessage(`Error while trying to load yaml file: ${filePath}`, e);
    }
  },

  // Reply flags based on 'messages.ephemeral' in settings.yml
  replyFlags(): MessageFlags.Ephemeral | undefined {
    return client.config.messages.ephemeral ? MessageFlags.Ephemeral : undefined;
  }

};

export default utils;
