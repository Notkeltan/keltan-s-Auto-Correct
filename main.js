/*
Auto Correct Plugin for Obsidian
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

var main_exports = {};
__export(main_exports, {
  default: () => AutoCorrectPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

var DEFAULT_SETTINGS = {
  corrections: `vinyette : vignette
compairing : comparing
medievil : medieval
recived : received
OMG : Oh My Gods
Oh my god : oh my gods
menstration : menstruation
conjour : conjure
conciousness : consciousness`,
  keepFirstLetterCapitalized: true,
  keepAllCaps: true
};

// Characters that trigger autocorrect
var TRIGGER_CHARS = [" ", ",", ".", "!", "?", ";", ":", "'", '"', ")", "]", "}", "-", "\n", "Enter"];

var AutoCorrectPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.correctionMap = new Map();
  }

  async onload() {
    await this.loadSettings();
    this.buildCorrectionMap();
    this.registerDomEvent(document, "keydown", (evt) => {
      if (TRIGGER_CHARS.includes(evt.key)) {
        this.handleTrigger();
      }
    });
    this.addSettingTab(new AutoCorrectSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.buildCorrectionMap();
  }

  buildCorrectionMap() {
    this.correctionMap.clear();
    const lines = this.settings.corrections.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes(":"))
        continue;
      const colonIndex = trimmed.indexOf(":");
      const wrong = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const correct = trimmed.substring(colonIndex + 1).trim();
      if (wrong && correct) {
        this.correctionMap.set(wrong, correct);
      }
    }
  }

  applyCapitalization(original, correction) {
    let result = correction;

    // Keep first letter capitalized
    if (this.settings.keepFirstLetterCapitalized && original.length > 0 && correction.length > 0) {
      const firstChar = original[0];
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        result = correction[0].toUpperCase() + correction.slice(1);
      }
    }

    // Keep all caps pattern (character by character)
    if (this.settings.keepAllCaps) {
      let hasMultipleCaps = false;
      let capsCount = 0;
      for (let i = 0; i < original.length; i++) {
        const char = original[i];
        if (char === char.toUpperCase() && char !== char.toLowerCase()) {
          capsCount++;
          if (capsCount > 1) {
            hasMultipleCaps = true;
            break;
          }
        }
      }

      if (hasMultipleCaps) {
        let newResult = "";
        for (let i = 0; i < correction.length; i++) {
          const corrChar = correction[i];
          // Find corresponding position in original (map proportionally if lengths differ)
          const origIndex = Math.min(i, original.length - 1);
          const origChar = original[origIndex];
          
          if (origChar === origChar.toUpperCase() && origChar !== origChar.toLowerCase()) {
            newResult += corrChar.toUpperCase();
          } else {
            newResult += corrChar.toLowerCase();
          }
        }
        result = newResult;
      }
    }

    return result;
  }

  handleTrigger() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view)
      return;
    const editor = view.editor;
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const textBeforeCursor = line.substring(0, cursor.ch);
    const wordMatch = textBeforeCursor.match(/(\S+)$/);
    if (!wordMatch)
      return;
    const word = wordMatch[1];
    const wordLower = word.toLowerCase();
    const correction = this.correctionMap.get(wordLower);
    if (correction) {
      const wordStart = cursor.ch - word.length;
      const finalCorrection = this.applyCapitalization(word, correction);
      editor.replaceRange(
        finalCorrection,
        { line: cursor.line, ch: wordStart },
        { line: cursor.line, ch: cursor.ch }
      );
    }
  }
};

var AutoCorrectSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("autocorrect-settings");
    containerEl.createEl("h2", { text: "Auto Correct - Settings" });

    // Toggle settings
    new import_obsidian.Setting(containerEl)
      .setName("Keep first letter capitalized")
      .setDesc("If the first letter is capitalized, the corrected word will also be capitalized (e.g., Vinyette → Vignette)")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.keepFirstLetterCapitalized)
        .onChange(async (value) => {
          this.plugin.settings.keepFirstLetterCapitalized = value;
          await this.plugin.saveSettings();
        }));

    new import_obsidian.Setting(containerEl)
      .setName("Keep all caps")
      .setDesc("Preserve capitalization pattern from the original word (e.g., viNyeTte → vigNeTte)")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.keepAllCaps)
        .onChange(async (value) => {
          this.plugin.settings.keepAllCaps = value;
          await this.plugin.saveSettings();
        }));

    // Snippets container
    const snippetsContainer = containerEl.createDiv("autocorrect-snippets-container");
    const leftCol = snippetsContainer.createDiv("autocorrect-left-col");
    const rightCol = snippetsContainer.createDiv("autocorrect-right-col");

    leftCol.createEl("h3", { text: "Corrections" });
    leftCol.createEl("p", {
      text: "Type here your corrections in format 'misspelled : correct', one per line."
    });
    leftCol.createEl("p", { text: "Empty lines will be ignored." });
    leftCol.createEl("p", { text: "Corrections trigger on Space or punctuation (, . ! ? ; : etc.)." });
    leftCol.createEl("p", { text: "Matching is case-insensitive." });

    const textarea = rightCol.createEl("textarea", {
      cls: "autocorrect-textarea",
      attr: {
        spellcheck: "false",
        placeholder: "vinyette : vignette\nOMG : Oh My Gods"
      }
    });
    textarea.value = this.plugin.settings.corrections;
    textarea.addEventListener("input", async () => {
      this.plugin.settings.corrections = textarea.value;
      await this.plugin.saveSettings();
    });
  }
};
