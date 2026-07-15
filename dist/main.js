import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.endsWith("...")) {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.minWidthToWrap = 40;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleSubcommandTerm(helper.subcommandTerm(command))
            )
          );
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleArgumentTerm(helper.argumentTerm(argument))
            )
          );
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (option.description) {
            return `${option.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return argument.description;
      }
      /**
       * Format a list of items, given a heading and an array of formatted items.
       *
       * @param {string} heading
       * @param {string[]} items
       * @param {Help} helper
       * @returns string[]
       */
      formatItemList(heading, items, helper) {
        if (items.length === 0) return [];
        return [helper.styleTitle(heading), ...items, ""];
      }
      /**
       * Group items by their help group heading.
       *
       * @param {Command[] | Option[]} unsortedItems
       * @param {Command[] | Option[]} visibleItems
       * @param {Function} getGroup
       * @returns {Map<string, Command[] | Option[]>}
       */
      groupItems(unsortedItems, visibleItems, getGroup) {
        const result = /* @__PURE__ */ new Map();
        unsortedItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) result.set(group, []);
        });
        visibleItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) {
            result.set(group, []);
          }
          result.get(group).push(item);
        });
        return result;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.boxWrap(
              helper.styleCommandDescription(commandDescription),
              helpWidth
            ),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return callFormatItem(
            helper.styleArgumentTerm(helper.argumentTerm(argument)),
            helper.styleArgumentDescription(helper.argumentDescription(argument))
          );
        });
        output = output.concat(
          this.formatItemList("Arguments:", argumentList, helper)
        );
        const optionGroups = this.groupItems(
          cmd.options,
          helper.visibleOptions(cmd),
          (option) => option.helpGroupHeading ?? "Options:"
        );
        optionGroups.forEach((options, group) => {
          const optionList = options.map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(this.formatItemList(group, optionList, helper));
        });
        if (helper.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(
            this.formatItemList("Global Options:", globalOptionList, helper)
          );
        }
        const commandGroups = this.groupItems(
          cmd.commands,
          helper.visibleCommands(cmd),
          (sub) => sub.helpGroup() || "Commands:"
        );
        commandGroups.forEach((commands, group) => {
          const commandList = commands.map((sub) => {
            return callFormatItem(
              helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
              helper.styleSubcommandDescription(helper.subcommandDescription(sub))
            );
          });
          output = output.concat(this.formatItemList(group, commandList, helper));
        });
        return output.join("\n");
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str2) {
        return stripColor(str2).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str2) {
        return str2;
      }
      styleUsage(str2) {
        return str2.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word === "[command]") return this.styleSubcommandText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleCommandText(word);
        }).join(" ");
      }
      styleCommandDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleOptionDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleSubcommandDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleArgumentDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleDescriptionText(str2) {
        return str2;
      }
      styleOptionTerm(str2) {
        return this.styleOptionText(str2);
      }
      styleSubcommandTerm(str2) {
        return str2.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleSubcommandText(word);
        }).join(" ");
      }
      styleArgumentTerm(str2) {
        return this.styleArgumentText(str2);
      }
      styleOptionText(str2) {
        return str2;
      }
      styleArgumentText(str2) {
        return str2;
      }
      styleSubcommandText(str2) {
        return str2;
      }
      styleCommandText(str2) {
        return str2;
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str2) {
        return /\n[^\S\r\n]/.test(str2);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        const itemIndent = 2;
        const itemIndentStr = " ".repeat(itemIndent);
        if (!description) return itemIndentStr + term;
        const paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        );
        const spacerWidth = 2;
        const helpWidth = this.helpWidth ?? 80;
        const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
        let formattedDescription;
        if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
          formattedDescription = description;
        } else {
          const wrappedDescription = helper.boxWrap(description, remainingWidth);
          formattedDescription = wrappedDescription.replace(
            /\n/g,
            "\n" + " ".repeat(termWidth + spacerWidth)
          );
        }
        return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str2, width) {
        if (width < this.minWidthToWrap) return str2;
        const rawLines = str2.split(/\r\n|\n/);
        const chunkPattern = /[\s]*[^\s]+/g;
        const wrappedLines = [];
        rawLines.forEach((line) => {
          const chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()];
          let sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            const visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width) {
              sumChunks.push(chunk);
              sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            const nextChunk = chunk.trimStart();
            sumChunks = [nextChunk];
            sumWidth = this.displayWidth(nextChunk);
          });
          wrappedLines.push(sumChunks.join(""));
        });
        return wrappedLines.join("\n");
      }
    };
    function stripColor(str2) {
      const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str2.replace(sgrPattern, "");
    }
    exports.Help = Help2;
    exports.stripColor = stripColor;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
        this.helpGroupHeading = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        if (this.negate) {
          return camelcase(this.name().replace(/^no-/, ""));
        }
        return camelcase(this.name());
      }
      /**
       * Set the help group heading.
       *
       * @param {string} heading
       * @return {Option}
       */
      helpGroup(heading) {
        this.helpGroupHeading = heading;
        return this;
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str2) {
      return str2.split("-").reduce((str3, word) => {
        return str3 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const shortFlagExp = /^-[^-]$/;
      const longFlagExp = /^--[^-]/;
      const flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
      if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
      if (!shortFlag && shortFlagExp.test(flagParts[0]))
        shortFlag = flagParts.shift();
      if (!shortFlag && longFlagExp.test(flagParts[0])) {
        shortFlag = longFlag;
        longFlag = flagParts.shift();
      }
      if (flagParts[0].startsWith("-")) {
        const unsupportedFlag = flagParts[0];
        const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        if (/^-[^-][^-]/.test(unsupportedFlag))
          throw new Error(
            `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
          );
        if (shortFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many short flags`);
        if (longFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many long flags`);
        throw new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process2 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2, stripColor } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = false;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._savedState = null;
        this._outputConfiguration = {
          writeOut: (str2) => process2.stdout.write(str2),
          writeErr: (str2) => process2.stderr.write(str2),
          outputError: (str2, write) => write(str2),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
          stripColor: (str2) => stripColor(str2)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
        this._helpGroupHeading = void 0;
        this._defaultCommandGroup = void 0;
        this._defaultOptionGroup = void 0;
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        this._outputConfiguration = {
          ...this._outputConfiguration,
          ...configuration
        };
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom argument processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, parseArg, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof parseArg === "function") {
          argument.default(defaultValue).argParser(parseArg);
        } else {
          argument.default(parseArg);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument?.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          if (enableOrNameAndArgs && this._defaultCommandGroup) {
            this._initCommandGroup(this._getHelpCommand());
          }
          return this;
        }
        const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this._initOptionGroup(option);
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this._initCommandGroup(command);
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._collectValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      _prepareForParse() {
        if (this._savedState === null) {
          this.saveStateBeforeParse();
        } else {
          this.restoreStateBeforeParse();
        }
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name;
        this._scriptPath = null;
        this.rawArgs = [];
        this._optionValues = { ...this._savedState._optionValues };
        this._optionValueSources = { ...this._savedState._optionValueSources };
        this.args = [];
        this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs.existsSync(executableFile)) return;
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          this._checkForMissingExecutable(
            executableFile,
            executableDir,
            subcommand._name
          );
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        subCommand._prepareForParse();
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise?.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent?.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} args
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(args) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        const negativeNumberArg = (arg) => {
          if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
          return !this._getCommandAndAncestors().some(
            (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
          );
        };
        let activeVariadicOption = null;
        let activeGroup = null;
        let i = 0;
        while (i < args.length || activeGroup) {
          const arg = activeGroup ?? args[i++];
          activeGroup = null;
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args.slice(i));
            break;
          }
          if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args[i++];
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
                  value = args[i++];
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                activeGroup = `-${arg.slice(2)}`;
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              unknown.push(...args.slice(i));
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg, ...args.slice(i));
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg, ...args.slice(i));
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg, ...args.slice(i));
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str2, flags, description) {
        if (str2 === void 0) return this._version;
        this._version = str2;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str2}
`);
          this._exit(0, "commander.version", str2);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str2, argsDescription) {
        if (str2 === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str2;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str2) {
        if (str2 === void 0) return this._summary;
        this._summary = str2;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str2) {
        if (str2 === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str2;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str2) {
        if (str2 === void 0) return this._name;
        this._name = str2;
        return this;
      }
      /**
       * Set/get the help group heading for this subcommand in parent command's help.
       *
       * @param {string} [heading]
       * @return {Command | string}
       */
      helpGroup(heading) {
        if (heading === void 0) return this._helpGroupHeading ?? "";
        this._helpGroupHeading = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for subcommands added to this command.
       * (This does not override a group set directly on the subcommand using .helpGroup().)
       *
       * @example
       * program.commandsGroup('Development Commands:);
       * program.command('watch')...
       * program.command('lint')...
       * ...
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      commandsGroup(heading) {
        if (heading === void 0) return this._defaultCommandGroup ?? "";
        this._defaultCommandGroup = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for options added to this command.
       * (This does not override a group set directly on the option using .helpGroup().)
       *
       * @example
       * program
       *   .optionsGroup('Development Options:')
       *   .option('-d, --debug', 'output extra debugging')
       *   .option('-p, --profile', 'output profiling information')
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      optionsGroup(heading) {
        if (heading === void 0) return this._defaultOptionGroup ?? "";
        this._defaultOptionGroup = heading;
        return this;
      }
      /**
       * @param {Option} option
       * @private
       */
      _initOptionGroup(option) {
        if (this._defaultOptionGroup && !option.helpGroupHeading)
          option.helpGroup(this._defaultOptionGroup);
      }
      /**
       * @param {Command} cmd
       * @private
       */
      _initCommandGroup(cmd) {
        if (this._defaultCommandGroup && !cmd.helpGroup())
          cmd.helpGroup(this._defaultCommandGroup);
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        const context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        const text = helper.formatHelp(this, helper);
        if (context.hasColors) return text;
        return this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        const error = !!contextOptions.error;
        let baseWrite;
        let hasColors;
        let helpWidth;
        if (error) {
          baseWrite = (str2) => this._outputConfiguration.writeErr(str2);
          hasColors = this._outputConfiguration.getErrHasColors();
          helpWidth = this._outputConfiguration.getErrHelpWidth();
        } else {
          baseWrite = (str2) => this._outputConfiguration.writeOut(str2);
          hasColors = this._outputConfiguration.getOutHasColors();
          helpWidth = this._outputConfiguration.getOutHelpWidth();
        }
        const write = (str2) => {
          if (!hasColors) str2 = this._outputConfiguration.stripColor(str2);
          return baseWrite(str2);
        };
        return { error, write, hasColors, helpWidth };
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const outputContext = this._getOutputContext(contextOptions);
        const eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
        this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        outputContext.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", eventContext);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", eventContext)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            if (this._helpOption === null) this._helpOption = void 0;
            if (this._defaultOptionGroup) {
              this._initOptionGroup(this._getHelpOption());
            }
          } else {
            this._helpOption = null;
          }
          return this;
        }
        this._helpOption = this.createOption(
          flags ?? "-h, --help",
          description ?? "display help for command"
        );
        if (flags || description) this._initOptionGroup(this._helpOption);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        this._initOptionGroup(option);
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = Number(process2.exitCode ?? 0);
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    function useColor() {
      if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
        return false;
      if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== void 0)
        return true;
      return void 0;
    }
    exports.Command = Command2;
    exports.useColor = useColor;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/main.ts
import { readFileSync as readFileSync7 } from "node:fs";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { dirname as dirname4, resolve as resolve3 } from "node:path";

// src/spec.ts
import { readFileSync } from "node:fs";
function loadSpec(specPath) {
  const raw = readFileSync(specPath, "utf8");
  return JSON.parse(raw);
}
function classifyType(schema) {
  if (!schema) return { type: "string" };
  if (schema.enum) return { type: "string", enumValues: schema.enum };
  if (schema.type === "array") return { type: "array" };
  if (schema.type === "object") return { type: "json" };
  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf || schema.oneOf;
    const primitive = variants.find((v) => v.type && v.type !== "null" && v.type !== "object" && v.type !== "array");
    if (primitive) return { type: primitive.type, enumValues: primitive.enum };
    return { type: "json" };
  }
  return { type: schema.type || "string", enumValues: schema.enum };
}
function paramsFromOperation(op) {
  const params = [];
  for (const p of op.parameters || []) {
    if (p.in !== "query") continue;
    const { type, enumValues } = classifyType(p.schema);
    params.push({
      name: p.name,
      type,
      required: !!p.required,
      description: p.description,
      enumValues
    });
  }
  return params;
}
function bodyPropsFromOperation(op) {
  const schema = op.requestBody?.content?.["application/json"]?.schema;
  if (!schema || schema.type !== "object" || !schema.properties) return { props: [], schema };
  const required = schema.required || [];
  const props = [];
  for (const [name, propSchema] of Object.entries(schema.properties)) {
    if (propSchema.deprecated) continue;
    const { type, enumValues } = classifyType(propSchema);
    props.push({
      name,
      type,
      required: required.includes(name),
      description: propSchema.description,
      enumValues
    });
  }
  return { props, schema };
}
function buildResourceMap(specPath) {
  const spec = loadSpec(specPath);
  const map = /* @__PURE__ */ new Map();
  for (const [pathStr, methods] of Object.entries(spec.paths)) {
    for (const [methodLower, opUntyped] of Object.entries(methods)) {
      const method = methodLower.toUpperCase();
      if (method !== "GET" && method !== "POST") continue;
      const op = opUntyped;
      const stripped = pathStr.replace(/^\/v\d+\//, "");
      const segments = stripped.split("/");
      const resource = segments[0];
      const action = segments.slice(1).join("-") || "root";
      const params = paramsFromOperation(op);
      const { props: bodyProps, schema: bodySchema } = bodyPropsFromOperation(op);
      const ops = map.get(resource) || [];
      ops.push({
        resource,
        action,
        method,
        path: pathStr,
        summary: op.summary,
        description: op.description,
        params,
        bodyProps,
        bodySchema
      });
      map.set(resource, ops);
    }
  }
  for (const ops of map.values()) {
    ops.sort((a, b) => {
      if (a.method !== b.method) return a.method === "GET" ? -1 : 1;
      return a.action.localeCompare(b.action);
    });
  }
  return map;
}
function snakeToKebab(s) {
  return s.replace(/_/g, "-");
}
function snakeToCamel(s) {
  return s.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
}

// src/dispatch.ts
import { readFileSync as readFileSync3 } from "node:fs";

// src/client.ts
import { readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
var BASE_URL = "https://public-api.luma.com";
var ADMIN_BASE_URL = "https://api.luma.com";
var PKG_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
var { version: PKG_VERSION } = JSON.parse(readFileSync2(PKG_PATH, "utf8"));
var USER_AGENT = `elnora-luma-cli/${PKG_VERSION}`;
var LumaApiError = class extends Error {
  constructor(status, statusText, body, method, path) {
    super(`Luma API ${method} ${path} \u2192 HTTP ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.method = method;
    this.path = path;
  }
  status;
  statusText;
  body;
  method;
  path;
};
var MAX_RETRIES = 3;
var RETRYABLE = /* @__PURE__ */ new Set([429, 500, 502, 503, 504]);
async function callLuma(opts) {
  const url = new URL(BASE_URL + opts.path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === void 0 || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const headers = {
    "x-luma-api-key": opts.apiKey,
    accept: "application/json",
    "user-agent": USER_AGENT
  };
  const init = { method: opts.method, headers };
  if (opts.body !== void 0 && opts.method !== "GET") {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  let lastResp = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const resp = await fetch(url, init);
    lastResp = resp;
    if (RETRYABLE.has(resp.status) && attempt < MAX_RETRIES - 1) {
      const retryAfter = Number(resp.headers.get("retry-after") || "");
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1e3, 1e4) : Math.min(1e3 * Math.pow(2, attempt), 5e3);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }
    const text = await resp.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!resp.ok) {
      throw new LumaApiError(resp.status, resp.statusText, parsed, opts.method, opts.path);
    }
    return parsed;
  }
  throw new LumaApiError(lastResp?.status ?? 0, lastResp?.statusText ?? "exhausted retries", null, opts.method, opts.path);
}
async function callLumaAdmin(opts) {
  const url = new URL(ADMIN_BASE_URL + opts.path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === void 0 || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const headers = {
    cookie: `luma.auth-session-key=${opts.sessionKey}`,
    accept: "application/json",
    "user-agent": USER_AGENT,
    "x-luma-client-type": "luma-web",
    origin: "https://luma.com",
    referer: "https://luma.com/"
  };
  const init = { method: opts.method, headers };
  if (opts.body !== void 0 && opts.method !== "GET") {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const resp = await fetch(url, init);
  const text = await resp.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!resp.ok) {
    throw new LumaApiError(resp.status, resp.statusText, parsed, opts.method, opts.path);
  }
  return parsed;
}
async function refreshSpec(targetPath) {
  const resp = await fetch(BASE_URL + "/openapi.json");
  if (!resp.ok) {
    throw new Error(`Failed to fetch openapi.json: HTTP ${resp.status} ${resp.statusText}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(targetPath, buf);
}

// src/output.ts
function printResult(result, raw) {
  if (result === null || result === void 0) {
    return;
  }
  const text = raw ? JSON.stringify(result) : JSON.stringify(result, null, 2);
  process.stdout.write(text + "\n");
}
function printError(err) {
  if (err instanceof LumaApiError) {
    process.stderr.write(`Luma API error: HTTP ${err.status} ${err.statusText} on ${err.method} ${err.path}
`);
    if (err.body !== null && err.body !== void 0) {
      const formatted = typeof err.body === "string" ? err.body : JSON.stringify(err.body, null, 2);
      process.stderr.write(formatted + "\n");
    }
    return;
  }
  if (err instanceof Error) {
    process.stderr.write(`Error: ${err.message}
`);
    return;
  }
  process.stderr.write(`Error: ${String(err)}
`);
}

// src/dispatch.ts
function readFileOrStdin(arg) {
  if (arg === "-") return readFileSync3(0, "utf8");
  if (arg.startsWith("@")) return readFileSync3(arg.slice(1), "utf8");
  return arg;
}
function readBodyArg(arg) {
  const raw = readFileOrStdin(arg);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`--body is not valid JSON: ${err.message}`);
  }
}
function getApiKey() {
  const key = process.env.LUMA_API_KEY;
  if (!key || key === "your-luma-api-key") {
    throw new Error(
      "LUMA_API_KEY is not set. Generate a calendar API key at https://luma.com/calendar/manage/api-keys (requires Luma Plus), then run `luma auth set-key <key>` or export LUMA_API_KEY."
    );
  }
  return key;
}
function coerceValue(prop, value) {
  if (value === void 0 || value === null) return void 0;
  switch (prop.type) {
    case "number":
    case "integer": {
      const n = Number(value);
      if (Number.isNaN(n)) throw new Error(`--${prop.name.replace(/_/g, "-")} expects a number, got: ${value}`);
      return n;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error(`--${prop.name.replace(/_/g, "-")} expects true/false`);
    case "array": {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        const expanded = readFileOrStdin(value).trim();
        if (expanded.startsWith("[")) {
          try {
            return JSON.parse(expanded);
          } catch (err) {
            throw new Error(
              `--${prop.name.replace(/_/g, "-")} expects a JSON array or a comma-separated list.
Parse error: ${err.message}
Hint: wrap the value in single quotes and use double quotes inside, e.g. --${prop.name.replace(/_/g, "-")} '["a","b"]'`
            );
          }
        }
        return expanded.includes(",") ? expanded.split(",").map((s) => s.trim()) : [expanded];
      }
      return [value];
    }
    case "json":
      if (typeof value === "string") {
        const expanded = readFileOrStdin(value);
        try {
          return JSON.parse(expanded);
        } catch (err) {
          throw new Error(
            `--${prop.name.replace(/_/g, "-")} expects valid JSON, got: ${expanded.slice(0, 120)}
Parse error: ${err.message}
Hint: wrap the value in single quotes and ensure inner strings use double quotes, e.g. --${prop.name.replace(/_/g, "-")} '{"key":"value"}'`
          );
        }
      }
      return value;
    default:
      if (typeof value === "string") return readFileOrStdin(value);
      return value;
  }
}
function pickValuesFromOpts(props, opts) {
  const out = {};
  for (const p of props) {
    const camelKey = snakeToCamel(p.name);
    const raw = opts[camelKey];
    if (raw === void 0 || raw === null || raw === "") continue;
    const coerced = coerceValue(p, raw);
    if (coerced !== void 0) out[p.name] = coerced;
  }
  return out;
}
function matchesSearch(entry, term) {
  const lower = term.toLowerCase();
  for (const v of Object.values(entry)) {
    if (typeof v === "string" && v.toLowerCase().includes(lower)) return true;
  }
  return false;
}
function filterEntries(entries, search) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    const rec = e;
    return terms.every((t) => matchesSearch(rec, t));
  });
}
async function dispatch(op, opts) {
  const apiKey = getApiKey();
  const query = op.method === "GET" ? pickValuesFromOpts(op.params, opts) : void 0;
  let body = void 0;
  if (op.method !== "GET") {
    if (opts.body !== void 0) {
      body = readBodyArg(opts.body);
    } else {
      const fromFlags = pickValuesFromOpts(op.bodyProps, opts);
      if (Object.keys(fromFlags).length > 0) body = fromFlags;
    }
  }
  if (opts.all && op.method === "GET") {
    const allEntries = [];
    let cursor;
    let pageCount = 0;
    do {
      const q = { ...query || {} };
      if (cursor) q["pagination_cursor"] = cursor;
      const resp = await callLuma({ apiKey, method: op.method, path: op.path, query: q });
      if (Array.isArray(resp?.entries)) {
        allEntries.push(...resp.entries);
        cursor = resp.has_more ? resp.next_cursor : void 0;
      } else {
        printResult(resp, !!opts.raw);
        return;
      }
      pageCount += 1;
      if (pageCount > 1e3) throw new Error("Pagination safety stop after 1000 pages");
    } while (cursor);
    const filtered = opts.search ? filterEntries(allEntries, opts.search) : allEntries;
    printResult({ entries: filtered, has_more: false, total: filtered.length }, !!opts.raw);
    return;
  }
  const result = await callLuma({ apiKey, method: op.method, path: op.path, query, body });
  if (opts.search && result && typeof result === "object" && Array.isArray(result.entries)) {
    const r = result;
    const filtered = filterEntries(r.entries, opts.search);
    printResult({ ...r, entries: filtered, total: filtered.length }, !!opts.raw);
    return;
  }
  printResult(result, !!opts.raw);
}

// src/admin.ts
var SESSION_HELP = "Needs LUMA_AUTH_SESSION_KEY \u2014 the `luma.auth-session-key` cookie from a logged-in host browser session (DevTools \u2192 Application \u2192 Cookies \u2192 luma.com). It expires; re-grab on a 401.";
function getSessionKey() {
  const key = process.env.LUMA_AUTH_SESSION_KEY;
  if (!key) throw new Error(`LUMA_AUTH_SESSION_KEY is not set. ${SESSION_HELP}`);
  return key;
}
var camel = (kebab) => kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
var EVENT_ID = { flag: "event-id", key: "event_api_id", required: true, desc: "Event API ID, e.g. evt-XXXX" };
var USER_ID = { flag: "user-id", key: "user_api_id", required: true, desc: "User API ID, e.g. usr-XXXX (from a guest's user_api_id)" };
var READS = [
  {
    name: "guest-timeline",
    path: "/event/admin/get-guest-timeline",
    summary: "per-guest email + registration history (sent/opened/added)",
    params: [EVENT_ID, USER_ID]
  },
  {
    name: "guest-payment",
    path: "/event/admin/guest/get-payment-info",
    summary: "per-guest payment / charge / refund detail",
    params: [EVENT_ID, USER_ID]
  },
  {
    name: "survey-responses",
    path: "/event/analytics/survey-responses",
    summary: "post-event feedback + ratings",
    params: [EVENT_ID]
  },
  {
    name: "page-views",
    path: "/insights/event/page-views",
    summary: "registration funnel / page-view analytics over time",
    params: [
      EVENT_ID,
      { flag: "start", key: "start", desc: "ISO start, e.g. 2030-05-28T00:00:00.000Z" },
      { flag: "end", key: "end", desc: "ISO end, e.g. 2030-06-04T23:59:59.999Z" },
      { flag: "timezone", key: "timezone", desc: "IANA tz, e.g. America/New_York" },
      { flag: "unit", key: "unit", desc: "Bucket size: hour | day" }
    ]
  },
  {
    name: "referrals",
    path: "/event/admin/get-referrals",
    summary: "registration referral attribution (who drove sign-ups)",
    params: [EVENT_ID]
  },
  {
    name: "zoom-attendance",
    path: "/event/attendance/from-zoom",
    summary: "actual Zoom attendance vs RSVP",
    params: [EVENT_ID]
  },
  {
    name: "recent-registrations",
    path: "/event/admin/get-recent-registrations",
    summary: "most recent registrations feed",
    params: [EVENT_ID]
  },
  {
    name: "invite-overview",
    path: "/event/admin/get-invite-overview",
    summary: "invite usage / availability overview",
    params: [EVENT_ID]
  },
  {
    name: "get-blasts",
    path: "/event/admin/get-blasts",
    summary: "sent + scheduled email blasts",
    params: [
      EVENT_ID,
      { flag: "include-scheduled", key: "include_scheduled", desc: "Pass 1 to include scheduled blasts" }
    ]
  },
  {
    name: "get-reminders",
    path: "/event/admin/get-reminders",
    summary: "scheduled event reminder emails",
    params: [EVENT_ID]
  }
];
function registerRead(eventGroup, cmd) {
  const sub = eventGroup.command(cmd.name).description(`GET api.luma.com${cmd.path} \u2014 ${cmd.summary} (ADMIN API)`);
  for (const p of cmd.params) {
    const flag = `--${p.flag} <val>`;
    if (p.required) sub.requiredOption(flag, p.desc);
    else sub.option(flag, p.desc);
  }
  sub.option("--raw", "Compact JSON output");
  sub.addHelpText("after", `
\u26A0 ADMIN API (cookie auth, undocumented). ${SESSION_HELP}
`);
  sub.action(async (opts) => {
    const sessionKey = getSessionKey();
    const query = {};
    for (const p of cmd.params) {
      const v = opts[camel(p.flag)];
      if (v !== void 0 && typeof v !== "boolean") query[p.key] = v;
    }
    const resp = await callLumaAdmin({ sessionKey, method: "GET", path: cmd.path, query });
    printResult(resp, !!opts.raw);
  });
}
function registerUpdateGuestName(eventGroup) {
  eventGroup.command("update-guest-name").description("POST api.luma.com/event/admin/guest/update \u2014 set a guest's display name (ADMIN API)").requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX").requiredOption("--guest-id <gst>", "Guest (RSVP) API ID \u2014 the `api_id` from `event get-guest`, e.g. gst-XXXX").requiredOption("--first-name <name>", "First name").requiredOption("--last-name <name>", "Last name").option("--raw", "Compact JSON output").addHelpText(
    "after",
    `
\u26A0 ADMIN API (cookie auth). ${SESSION_HELP}
Once a name is set, only the guest can change it from their own settings page.
`
  ).action(async (opts) => {
    const sessionKey = getSessionKey();
    const resp = await callLumaAdmin({
      sessionKey,
      method: "POST",
      path: "/event/admin/guest/update",
      body: {
        event_api_id: opts.eventId,
        rsvp_api_id: opts.guestId,
        first_name: opts.firstName,
        last_name: opts.lastName
      }
    });
    printResult(resp, !!opts.raw);
  });
}
function registerAdminCommands(eventGroup) {
  registerUpdateGuestName(eventGroup);
  for (const cmd of READS) registerRead(eventGroup, cmd);
}

// src/auth.ts
import { chmodSync, mkdirSync, readFileSync as readFileSync5, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join2 } from "node:path";

// src/env.ts
import { existsSync, readFileSync as readFileSync4 } from "node:fs";
import { homedir } from "node:os";
import { dirname as dirname2, join, resolve as resolve2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var ALLOWED_ENV_KEYS = /* @__PURE__ */ new Set(["LUMA_API_KEY", "LUMA_AUTH_SESSION_KEY", "STRIPE_API_KEY"]);
var envSources = {};
function configDir() {
  const override = process.env.LUMA_CONFIG_DIR?.trim();
  if (override) return override;
  return join(homedir(), ".config", "elnora-luma");
}
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync4(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!ALLOWED_ENV_KEYS.has(key)) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === void 0) {
      if (value !== "") {
        process.env[key] = value;
        envSources[key] = filePath;
      }
    }
  }
}
function loadEnv() {
  for (const key of ALLOWED_ENV_KEYS) {
    if (process.env[key]) envSources[key] = "environment";
  }
  parseEnvFile(join(configDir(), ".env"));
  const bundleDir = dirname2(fileURLToPath2(import.meta.url));
  parseEnvFile(resolve2(bundleDir, "..", ".env"));
}

// src/auth.ts
var KEY_URL = "https://luma.com/calendar/manage/api-keys";
function mask(value) {
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}
function upsertEnvFile(filePath, updates) {
  let existing = "";
  try {
    existing = readFileSync5(filePath, "utf8");
  } catch {
  }
  const lines = existing ? existing.split("\n") : [];
  const pending = { ...updates };
  const out = lines.map((line) => {
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return line;
    const key = line.slice(0, eqIndex).trim();
    if (key in pending) {
      const replaced = `${key}=${pending[key]}`;
      delete pending[key];
      return replaced;
    }
    return line;
  });
  for (const [key, value] of Object.entries(pending)) out.push(`${key}=${value}`);
  writeFileSync2(filePath, `${out.filter((l, i) => l !== "" || i < out.length - 1).join("\n").replace(/\n+$/, "")}
`, { mode: 384 });
  chmodSync(filePath, 384);
}
function registerAuthCommands(program2) {
  const auth = program2.command("auth").description("Credential setup and status");
  auth.command("set-key").description(`Save LUMA_API_KEY to ${join2(configDir(), ".env")} (created with 0600 permissions)`).argument("<api-key>", `Luma API key \u2014 generate at ${KEY_URL} (requires Luma Plus)`).option("--session-key <value>", "Also store LUMA_AUTH_SESSION_KEY (only needed for `event` admin commands; it expires)").option("--stripe-key <value>", "Also store STRIPE_API_KEY (only needed for `stripe reconcile`; use a RESTRICTED read-only rk_ key)").action((apiKey, opts) => {
    const key = apiKey.trim();
    if (!key) throw new Error("API key is empty.");
    const dir = configDir();
    mkdirSync(dir, { recursive: true });
    const filePath = join2(dir, ".env");
    const updates = { LUMA_API_KEY: key };
    if (opts.sessionKey?.trim()) updates.LUMA_AUTH_SESSION_KEY = opts.sessionKey.trim();
    if (opts.stripeKey?.trim()) updates.STRIPE_API_KEY = opts.stripeKey.trim();
    upsertEnvFile(filePath, updates);
    process.stderr.write(`Saved LUMA_API_KEY (${mask(key)}) to ${filePath}
`);
    process.stderr.write("Verify with: luma auth status\n");
  });
  auth.command("status").description("Show where credentials resolved from and verify the API key against Luma").option("--raw", "Compact JSON output").action(async (opts) => {
    const key = process.env.LUMA_API_KEY;
    const session = process.env.LUMA_AUTH_SESSION_KEY;
    if (!key || key === "your-luma-api-key") {
      process.stderr.write(
        `LUMA_API_KEY is not set.
Generate a key at ${KEY_URL} (requires Luma Plus), then run:
  luma auth set-key <key>
`
      );
      process.exit(1);
    }
    process.stderr.write(`LUMA_API_KEY: ${mask(key)} (source: ${envSources.LUMA_API_KEY ?? "environment"})
`);
    process.stderr.write(
      session ? `LUMA_AUTH_SESSION_KEY: ${mask(session)} (source: ${envSources.LUMA_AUTH_SESSION_KEY ?? "environment"})
` : "LUMA_AUTH_SESSION_KEY: not set (only needed for `event` admin commands)\n"
    );
    const stripe = process.env.STRIPE_API_KEY;
    process.stderr.write(
      stripe ? `STRIPE_API_KEY: ${mask(stripe)} (source: ${envSources.STRIPE_API_KEY ?? "environment"})${stripe.startsWith("rk_") ? "" : " \u26A0 not a restricted rk_ key \u2014 reconcile only needs read access"}
` : "STRIPE_API_KEY: not set (only needed for `stripe reconcile`)\n"
    );
    const me = await callLuma({ apiKey: key, method: "GET", path: "/v1/user/get-self" });
    printResult(me, !!opts.raw);
  });
}

// src/report.ts
import { readFileSync as readFileSync6, renameSync, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname3, join as join3 } from "node:path";

// src/csv.ts
function csvEscape(value) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
var FORMULA_PREFIX = /^[=+\-@\t\r]/;
var PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
function neutralize(value) {
  return FORMULA_PREFIX.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}
function toCsv(header, rows) {
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(
      row.map((cell) => {
        if (cell === null || cell === void 0) return "";
        if (typeof cell === "number") return String(cell);
        return csvEscape(neutralize(cell));
      }).join(",")
    );
  }
  return lines.join("\n") + "\n";
}

// src/reporting.ts
var SALES_SCHEMA = "elnora-luma/report-sales@1";
var SALES_CALENDAR_SCHEMA = "elnora-luma/report-sales-calendar@1";
var ROSTER_SCHEMA = "elnora-luma/roster@1";
function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
var str = (v) => typeof v === "string" ? v : "";
function currencyKey(c) {
  const s = str(c).trim().toLowerCase();
  return s === "" ? "unknown" : s;
}
function extractEntries(resp) {
  if (Array.isArray(resp)) return resp;
  const entries = resp?.entries;
  if (Array.isArray(entries)) return entries;
  return [];
}
function answersLookup(raw, field) {
  const answers = raw.registration_answers;
  if (!Array.isArray(answers)) return "";
  for (const a of answers) {
    const v = a?.[field];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}
function normalizeGuest(entry) {
  const nested = entry.guest;
  const raw = { ...typeof nested === "object" && nested !== null ? nested : {}, ...entry };
  const ticketsRaw = Array.isArray(raw.event_tickets) ? raw.event_tickets : raw.event_ticket && typeof raw.event_ticket === "object" ? [raw.event_ticket] : [];
  const buckets = /* @__PURE__ */ new Map();
  let capturedTickets = 0;
  let uncapturedCents = 0;
  for (const t of ticketsRaw) {
    const amount = typeof t.amount === "number" ? t.amount : 0;
    if (amount <= 0) continue;
    if (t.is_captured) {
      const key = currencyKey(t.currency);
      const b = buckets.get(key) ?? { currency: key, gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 };
      b.gross_cents += amount;
      b.discount_cents += typeof t.amount_discount === "number" ? t.amount_discount : 0;
      b.tax_cents += typeof t.amount_tax === "number" ? t.amount_tax : 0;
      b.tickets += 1;
      buckets.set(key, b);
      capturedTickets += 1;
    } else {
      uncapturedCents += amount;
    }
  }
  const payment = capturedTickets > 0 ? "paid" : uncapturedCents > 0 ? "uncaptured" : "free";
  const orders = Array.isArray(raw.event_ticket_orders) ? raw.event_ticket_orders : [];
  const couponCodes = Array.from(
    new Set(orders.map((o) => str(o?.coupon_info?.code).trim()).filter((c) => c !== ""))
  ).sort();
  const email = normalizeEmail(raw.email ?? raw.user_email);
  const apiId = str(raw.api_id ?? raw.id);
  const captured = Array.from(buckets.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  const primaryTicket = ticketsRaw.find((t) => t.is_captured && (t.amount ?? 0) > 0) ?? ticketsRaw[0];
  return {
    key: email !== "" ? email : apiId,
    guest_api_id: apiId,
    email,
    name: str(raw.name ?? raw.user_name),
    first_name: str(raw.first_name ?? raw.user_first_name),
    last_name: str(raw.last_name ?? raw.user_last_name),
    company: answersLookup(raw, "answer_company"),
    job_title: answersLookup(raw, "answer_job_title"),
    approval_status: str(raw.approval_status),
    payment,
    captured,
    uncaptured_cents: uncapturedCents,
    ticket_type_ids: Array.from(new Set(ticketsRaw.map((t) => str(t.event_ticket_type_id)).filter((s) => s !== ""))).sort(),
    ticket_type_counts: ticketsRaw.reduce((acc, t) => {
      const id = str(t.event_ticket_type_id);
      if (id !== "") acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {}),
    primary_ticket_type_id: str(primaryTicket?.event_ticket_type_id),
    ticket_type: str(primaryTicket?.name),
    coupon_codes: couponCodes,
    registered_at: str(raw.registered_at),
    checked_in_at: str(raw.checked_in_at),
    utm_source: str(raw.utm_source),
    custom_source: str(raw.custom_source)
  };
}
function normalizeGuests(resp) {
  return extractEntries(resp).map(normalizeGuest).sort((a, b) => a.key.localeCompare(b.key) || a.guest_api_id.localeCompare(b.guest_api_id));
}
function normalizeEventInfo(resp) {
  const outer = resp ?? {};
  const ev = typeof outer.event === "object" && outer.event !== null ? outer.event : outer;
  return {
    id: str(ev.api_id ?? ev.id),
    name: str(ev.name),
    start_at: str(ev.start_at),
    end_at: str(ev.end_at),
    timezone: str(ev.timezone)
  };
}
function normalizeTicketTypes(resp) {
  const outer = resp ?? {};
  const list = Array.isArray(outer.ticket_types) ? outer.ticket_types : extractEntries(resp);
  return list.map((tt) => ({
    id: str(tt.api_id ?? tt.id),
    name: str(tt.name),
    type: str(tt.type),
    price_cents: typeof tt.cents === "number" ? tt.cents : null,
    currency: currencyKey(tt.currency),
    is_hidden: tt.is_hidden === true,
    max_capacity: typeof tt.max_capacity === "number" ? tt.max_capacity : null
  })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
function sortedCountMap(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const v of values) counts.set(v || "unknown", (counts.get(v || "unknown") ?? 0) + 1);
  const out = {};
  for (const k of Array.from(counts.keys()).sort()) out[k] = counts.get(k);
  return out;
}
function couponUsage(entries) {
  const usage = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const nested = entry.guest;
    const raw = { ...typeof nested === "object" && nested !== null ? nested : {}, ...entry };
    const orders = Array.isArray(raw.event_ticket_orders) ? raw.event_ticket_orders : [];
    for (const o of orders) {
      const code = str(o?.coupon_info?.code).trim();
      if (code === "") continue;
      const key = `${code.toLowerCase()}|${currencyKey(o.currency)}`;
      const u = usage.get(key) ?? { code, uses: 0, captured_uses: 0, discount_cents: 0, currency: currencyKey(o.currency) };
      u.uses += 1;
      if (o.is_captured) {
        u.captured_uses += 1;
        u.discount_cents += typeof o.amount_discount === "number" ? o.amount_discount : 0;
      }
      usage.set(key, u);
    }
  }
  return Array.from(usage.values()).sort((a, b) => a.code.localeCompare(b.code) || a.currency.localeCompare(b.currency));
}
function buildSalesSummary(event, ticketTypes, guests, rawGuestEntries) {
  const revenue = /* @__PURE__ */ new Map();
  for (const g of guests) {
    for (const b of g.captured) {
      const agg = revenue.get(b.currency) ?? { currency: b.currency, gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 };
      agg.gross_cents += b.gross_cents;
      agg.discount_cents += b.discount_cents;
      agg.tax_cents += b.tax_cents;
      agg.tickets += b.tickets;
      revenue.set(b.currency, agg);
    }
  }
  const pending = guests.filter((g) => g.approval_status === "pending_approval");
  const oldestPending = pending.map((g) => g.registered_at).filter((s) => s !== "").sort()[0] ?? "";
  const holding = guests.filter((g) => g.approval_status !== "declined");
  const soldByType = /* @__PURE__ */ new Map();
  for (const g of holding) {
    for (const [id, n] of Object.entries(g.ticket_type_counts)) {
      const s = soldByType.get(id) ?? { sold: 0, captured: 0, gross: /* @__PURE__ */ new Map() };
      s.sold += n;
      soldByType.set(id, s);
    }
    if (g.payment === "paid") {
      const id = g.primary_ticket_type_id !== "" ? g.primary_ticket_type_id : g.ticket_type_ids[0];
      if (id !== void 0 && id !== "") {
        const s = soldByType.get(id) ?? { sold: 0, captured: 0, gross: /* @__PURE__ */ new Map() };
        s.captured += 1;
        for (const b of g.captured) s.gross.set(b.currency, (s.gross.get(b.currency) ?? 0) + b.gross_cents);
        soldByType.set(id, s);
      }
    }
  }
  const knownIds = new Set(ticketTypes.map((t) => t.id));
  const phantomTypes = Array.from(soldByType.keys()).filter((id) => !knownIds.has(id)).sort().map((id) => ({ id, name: "(unknown ticket type)", type: "", price_cents: null, currency: "unknown", is_hidden: false, max_capacity: null }));
  const ticketTypeSales = [...ticketTypes, ...phantomTypes].map((tt) => {
    const s = soldByType.get(tt.id) ?? { sold: 0, captured: 0, gross: /* @__PURE__ */ new Map() };
    return {
      ...tt,
      sold: s.sold,
      captured: s.captured,
      captured_gross: Array.from(s.gross.entries()).map(([currency, cents]) => ({ currency, cents })).sort((a, b) => a.currency.localeCompare(b.currency)),
      capacity_pct: tt.max_capacity !== null && tt.max_capacity > 0 ? Math.round(s.sold / tt.max_capacity * 100) : null
    };
  });
  return {
    schema: SALES_SCHEMA,
    event,
    guests: {
      total: guests.length,
      by_approval_status: sortedCountMap(guests.map((g) => g.approval_status)),
      by_payment: {
        paid: guests.filter((g) => g.payment === "paid").length,
        uncaptured: guests.filter((g) => g.payment === "uncaptured").length,
        free: guests.filter((g) => g.payment === "free").length
      },
      checked_in: guests.filter((g) => g.checked_in_at !== "").length,
      pending_approval: { count: pending.length, oldest_registered_at: oldestPending }
    },
    revenue: Array.from(revenue.values()).sort((a, b) => a.currency.localeCompare(b.currency)),
    ticket_types: ticketTypeSales,
    coupons: couponUsage(rawGuestEntries)
  };
}
function formatCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
function buildRosterRows(guests) {
  const rows = [];
  for (const g of guests) {
    const buckets = g.captured.length > 0 ? g.captured : [{ currency: "", gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 }];
    for (const b of buckets) {
      rows.push({
        key: g.key,
        guest_api_id: g.guest_api_id,
        email: g.email,
        name: g.name,
        first_name: g.first_name,
        last_name: g.last_name,
        company: g.company,
        job_title: g.job_title,
        approval_status: g.approval_status,
        payment: g.payment,
        amount_cents: b.gross_cents,
        amount: formatCents(b.gross_cents),
        amount_discount_cents: b.discount_cents,
        amount_tax_cents: b.tax_cents,
        currency: b.currency,
        ticket_type: g.ticket_type,
        coupon_codes: g.coupon_codes.join(" "),
        registered_at: g.registered_at,
        checked_in_at: g.checked_in_at,
        utm_source: g.utm_source,
        custom_source: g.custom_source
      });
    }
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key) || a.guest_api_id.localeCompare(b.guest_api_id) || a.currency.localeCompare(b.currency));
}
var ROSTER_COLUMNS = [
  "name",
  "first_name",
  "last_name",
  "email",
  "company",
  "job_title",
  "approval_status",
  "payment",
  "amount_cents",
  "amount",
  "amount_discount_cents",
  "amount_tax_cents",
  "currency",
  "ticket_type",
  "coupon_codes",
  "registered_at",
  "checked_in_at",
  "utm_source",
  "custom_source",
  "guest_api_id"
];
function computeWarnings(summary, thresholds, nowMs) {
  const warnings = [];
  for (const tt of summary.ticket_types) {
    if (tt.max_capacity === null || tt.max_capacity <= 0) continue;
    if (tt.sold >= tt.max_capacity) {
      warnings.push({ code: "sold_out", message: `Ticket type "${tt.name}" is sold out (${tt.sold}/${tt.max_capacity}).` });
    } else if (tt.capacity_pct !== null && tt.capacity_pct >= thresholds.capacityPct) {
      warnings.push({ code: "near_capacity", message: `Ticket type "${tt.name}" is at ${tt.capacity_pct}% capacity (${tt.sold}/${tt.max_capacity}).` });
    }
  }
  const pending = summary.guests.pending_approval;
  if (pending.count > 0 && pending.oldest_registered_at !== "") {
    const oldestMs = Date.parse(pending.oldest_registered_at);
    if (Number.isFinite(oldestMs) && nowMs - oldestMs > thresholds.pendingHours * 36e5) {
      const hours = Math.floor((nowMs - oldestMs) / 36e5);
      warnings.push({ code: "pending_aging", message: `${pending.count} guest(s) pending approval; oldest has waited ${hours}h.` });
    }
  }
  if (pending.count > 0 && summary.event.start_at !== "") {
    const startMs = Date.parse(summary.event.start_at);
    if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs < thresholds.startSoonHours * 36e5) {
      warnings.push({ code: "pending_before_start", message: `Event starts within ${thresholds.startSoonHours}h with ${pending.count} approval(s) outstanding.` });
    }
  }
  return warnings;
}
function money(cents, currency) {
  return `${formatCents(cents)} ${currency === "" || currency === "unknown" ? "?" : currency.toUpperCase()}`;
}
function mdSafe(value) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\|/g, "\\|").trim();
}
function renderSalesMd(s) {
  const lines = [];
  lines.push(`# Sales report \u2014 ${mdSafe(s.event.name || s.event.id)}`);
  lines.push("");
  lines.push(`Event \`${s.event.id}\` \xB7 starts ${s.event.start_at || "?"} (${s.event.timezone || "tz unknown"})`);
  lines.push("");
  const rev = s.revenue.length > 0 ? s.revenue.map((b) => `${money(b.gross_cents, b.currency)} gross (${b.tickets} tickets, discounts ${money(b.discount_cents, b.currency)}, tax ${money(b.tax_cents, b.currency)})`).join("; ") : "no captured revenue";
  lines.push(`**Captured revenue:** ${rev}`);
  const g = s.guests;
  lines.push(`**Guests:** ${g.total} total \u2014 ${g.by_payment.paid} paid, ${g.by_payment.free} free/comp, ${g.by_payment.uncaptured} uncaptured checkout; ${g.checked_in} checked in`);
  const statuses = Object.entries(g.by_approval_status).map(([k, v]) => `${k}: ${v}`).join(", ");
  lines.push(`**Approval status:** ${statuses || "none"}`);
  if (g.pending_approval.count > 0) {
    lines.push(`**Approval queue:** ${g.pending_approval.count} pending (oldest ${g.pending_approval.oldest_registered_at || "?"})`);
  }
  if (s.ticket_types.length > 0) {
    lines.push("");
    lines.push("| Ticket type | Sold | Captured | Revenue | Capacity |");
    lines.push("|---|---|---|---|---|");
    for (const tt of s.ticket_types) {
      const revs = tt.captured_gross.map((x) => money(x.cents, x.currency)).join("; ") || "\u2014";
      const cap = tt.max_capacity !== null ? `${tt.sold}/${tt.max_capacity}${tt.capacity_pct !== null ? ` (${tt.capacity_pct}%)` : ""}` : "\u2014";
      lines.push(`| ${mdSafe(tt.name)}${tt.is_hidden ? " (hidden)" : ""} | ${tt.sold} | ${tt.captured} | ${revs} | ${cap} |`);
    }
  }
  if (s.coupons.length > 0) {
    lines.push("");
    lines.push("| Coupon | Uses | Captured uses | Discount given |");
    lines.push("|---|---|---|---|");
    for (const c of s.coupons) {
      lines.push(`| ${mdSafe(c.code)} | ${c.uses} | ${c.captured_uses} | ${money(c.discount_cents, c.currency)} |`);
    }
  }
  return lines.join("\n") + "\n";
}
function buildCalendarSales(window, events) {
  const totals = /* @__PURE__ */ new Map();
  for (const ev of events) {
    for (const b of ev.revenue) {
      const agg = totals.get(b.currency) ?? { currency: b.currency, gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 };
      agg.gross_cents += b.gross_cents;
      agg.discount_cents += b.discount_cents;
      agg.tax_cents += b.tax_cents;
      agg.tickets += b.tickets;
      totals.set(b.currency, agg);
    }
  }
  const sorted = [...events].sort((a, b) => a.event.start_at.localeCompare(b.event.start_at) || a.event.id.localeCompare(b.event.id));
  return {
    schema: SALES_CALENDAR_SCHEMA,
    window,
    events: sorted,
    totals: Array.from(totals.values()).sort((a, b) => a.currency.localeCompare(b.currency))
  };
}
function renderCalendarSalesMd(c) {
  const lines = [];
  lines.push(`# Calendar sales report`);
  lines.push("");
  lines.push(`Window: ${c.window.after || "(beginning)"} \u2192 ${c.window.before || "(now)"} \xB7 ${c.events.length} event(s)`);
  lines.push("");
  lines.push("| Event | Starts | Paid | Free | Revenue |");
  lines.push("|---|---|---|---|---|");
  for (const ev of c.events) {
    const rev = ev.revenue.map((b) => money(b.gross_cents, b.currency)).join("; ") || "\u2014";
    lines.push(`| ${mdSafe(ev.event.name || ev.event.id)} | ${ev.event.start_at || "?"} | ${ev.guests.by_payment.paid} | ${ev.guests.by_payment.free} | ${rev} |`);
  }
  lines.push("");
  const totals = c.totals.map((b) => `${money(b.gross_cents, b.currency)} gross (${b.tickets} tickets)`).join("; ") || "no captured revenue";
  lines.push(`**Totals:** ${totals}`);
  return lines.join("\n") + "\n";
}

// src/diff.ts
var DIFF_SCHEMA = "elnora-luma/report-diff@1";
var DIFF_FIELDS = [
  "approval_status",
  "payment",
  "amount_cents",
  "currency",
  "ticket_type",
  "coupon_codes",
  "checked_in_at"
];
function parseRosterDocument(raw, label) {
  const doc = raw;
  if (!doc || typeof doc !== "object" || typeof doc.schema !== "string" || !doc.schema.startsWith("elnora-luma/roster@")) {
    throw new Error(
      `${label}: not a roster document \u2014 expected JSON produced by \`report roster --format json\` (schema "${ROSTER_SCHEMA}").`
    );
  }
  if (!Array.isArray(doc.rows)) throw new Error(`${label}: roster document has no rows[] array.`);
  return {
    schema: doc.schema,
    event: { id: doc.event?.id ?? "", name: doc.event?.name ?? "" },
    rows: doc.rows
  };
}
var rowKey = (r) => `${r.key}|${r.currency}`;
function diffRosters(oldDoc, newDoc) {
  const oldMap = new Map(oldDoc.rows.map((r) => [rowKey(r), r]));
  const newMap = new Map(newDoc.rows.map((r) => [rowKey(r), r]));
  const added = [];
  const changed = [];
  for (const [key, row] of newMap) {
    const prev = oldMap.get(key);
    if (!prev) {
      added.push(row);
      continue;
    }
    const before = {};
    const after = {};
    for (const f of DIFF_FIELDS) {
      if (prev[f] !== row[f]) {
        before[f] = prev[f];
        after[f] = row[f];
      }
    }
    if (Object.keys(after).length > 0) {
      changed.push({ key, email: row.email, name: row.name, before, after });
    }
  }
  const removed = Array.from(oldMap.entries()).filter(([key]) => !newMap.has(key)).map(([, row]) => row);
  const delta = /* @__PURE__ */ new Map();
  const add = (currency, cents) => {
    if (cents === 0) return;
    delta.set(currency, (delta.get(currency) ?? 0) + cents);
  };
  for (const r of added) add(r.currency, r.amount_cents);
  for (const r of removed) add(r.currency, -r.amount_cents);
  for (const c of changed) {
    if (c.after.amount_cents !== void 0) {
      const currency = c.after.currency ?? c.before.currency ?? "";
      add(currency, (c.after.amount_cents ?? 0) - (c.before.amount_cents ?? 0));
    }
  }
  return {
    schema: DIFF_SCHEMA,
    event: newDoc.event,
    added: [...added].sort((a, b) => a.key.localeCompare(b.key)),
    removed: [...removed].sort((a, b) => a.key.localeCompare(b.key)),
    changed: [...changed].sort((a, b) => a.key.localeCompare(b.key)),
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      captured_delta: Array.from(delta.entries()).map(([currency, cents]) => ({ currency, cents })).sort((a, b) => a.currency.localeCompare(b.currency))
    }
  };
}
function diffIsEmpty(d) {
  return d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0;
}
function renderDiffMd(d) {
  if (diffIsEmpty(d)) return "";
  const lines = [];
  lines.push(`# Guest changes \u2014 ${mdSafe(d.event.name || d.event.id)}`);
  lines.push("");
  const deltas = d.summary.captured_delta.map((x) => money(x.cents, x.currency)).join("; ");
  lines.push(`${d.summary.added} new, ${d.summary.removed} removed, ${d.summary.changed} changed${deltas ? ` \xB7 captured revenue delta: ${deltas}` : ""}`);
  const describe = (r) => `${mdSafe(r.name || r.email || r.guest_api_id)}${r.email ? ` <${mdSafe(r.email)}>` : ""} \u2014 ${mdSafe(r.approval_status)}, ${r.payment}${r.amount_cents > 0 ? `, ${money(r.amount_cents, r.currency)}` : ""}`;
  if (d.added.length > 0) {
    lines.push("");
    lines.push("## New");
    for (const r of d.added) lines.push(`- ${describe(r)}`);
  }
  if (d.removed.length > 0) {
    lines.push("");
    lines.push("## Removed");
    for (const r of d.removed) lines.push(`- ${describe(r)}`);
  }
  if (d.changed.length > 0) {
    lines.push("");
    lines.push("## Changed");
    for (const c of d.changed) {
      const fields = Object.keys(c.after).map((f) => `${f}: ${mdSafe(String(c.before[f] ?? "\u2205")) || "\u2205"} \u2192 ${mdSafe(String(c.after[f] ?? "\u2205")) || "\u2205"}`).join(", ");
      lines.push(`- ${mdSafe(c.name || c.email || c.key)}: ${fields}`);
    }
  }
  return lines.join("\n") + "\n";
}

// src/stripe.ts
var STRIPE_BASE_URL = "https://api.stripe.com";
var MAX_PAGES = 50;
var RETRYABLE2 = /* @__PURE__ */ new Set([429, 500, 502, 503, 504]);
var StripeApiError = class extends Error {
  constructor(status, statusText, body, path) {
    super(`Stripe API GET ${path} \u2192 HTTP ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.path = path;
  }
  status;
  statusText;
  body;
  path;
};
function getStripeKey() {
  const key = process.env.STRIPE_API_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_API_KEY is not set. Create a RESTRICTED read-only key (rk_...) at https://dashboard.stripe.com/apikeys, then run `luma auth set-key <luma-key> --stripe-key <rk_key>` or export STRIPE_API_KEY."
    );
  }
  return key;
}
async function callStripe(opts) {
  const url = new URL(STRIPE_BASE_URL + opts.path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === void 0 || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const doFetch = opts.fetchImpl ?? fetch;
  let lastResp = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await doFetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${opts.apiKey}`, accept: "application/json" }
    });
    lastResp = resp;
    if (RETRYABLE2.has(resp.status) && attempt < 2) {
      const retryAfter = Number(resp.headers.get("retry-after") || "");
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1e3, 1e4) : Math.min(1e3 * 2 ** attempt, 5e3);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }
    const text = await resp.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!resp.ok) throw new StripeApiError(resp.status, resp.statusText, parsed, opts.path);
    return parsed;
  }
  throw new StripeApiError(lastResp?.status ?? 0, lastResp?.statusText ?? "exhausted retries", null, opts.path);
}
async function listCharges(apiKey, sinceUnix, fetchImpl) {
  const charges = [];
  let startingAfter;
  for (let page = 0; page < MAX_PAGES; page++) {
    const resp = await callStripe({
      apiKey,
      path: "/v1/charges",
      query: { limit: 100, "created[gte]": sinceUnix, starting_after: startingAfter },
      fetchImpl
    });
    const data = Array.isArray(resp?.data) ? resp.data : [];
    charges.push(...data);
    if (!resp?.has_more || data.length === 0) return { charges, truncated: false };
    startingAfter = data[data.length - 1].id;
  }
  return { charges, truncated: true };
}
function chargeEmail(c) {
  return normalizeEmail(c.metadata?.email) || normalizeEmail(c.receipt_email) || normalizeEmail(c.billing_details?.email);
}
function isLumaCharge(c) {
  return typeof c.metadata?.luma_payment_started_api_id === "string" && c.metadata.luma_payment_started_api_id !== "";
}
var RECONCILE_SCHEMA = "elnora-luma/stripe-reconcile@1";
function reconcile(event, guests, charges, sinceUnix, truncated) {
  const lumaCharges = charges.filter((c) => isLumaCharge(c) && c.status === "succeeded");
  const chargesByKey = /* @__PURE__ */ new Map();
  for (const c of lumaCharges) {
    const email = chargeEmail(c);
    if (email === "") continue;
    const key = `${email}|${(c.currency || "unknown").toLowerCase()}`;
    const agg = chargesByKey.get(key) ?? { cents: 0, refunded: 0, ids: [] };
    agg.cents += c.amount;
    agg.refunded += c.amount_refunded ?? 0;
    agg.ids.push(c.id);
    chargesByKey.set(key, agg);
  }
  const lumaByKey = /* @__PURE__ */ new Map();
  let unmatchable = 0;
  for (const g of guests) {
    if (g.payment !== "paid") continue;
    if (g.email === "") {
      unmatchable += 1;
      continue;
    }
    for (const b of g.captured) {
      const key = `${g.email}|${b.currency}`;
      const agg = lumaByKey.get(key) ?? { email: g.email, currency: b.currency, cents: 0, names: [] };
      agg.cents += b.gross_cents;
      if (g.name !== "" && !agg.names.includes(g.name)) agg.names.push(g.name);
      lumaByKey.set(key, agg);
    }
  }
  const matched = [];
  const noCharge = [];
  const matchedKeys = /* @__PURE__ */ new Set();
  for (const [key, l] of lumaByKey) {
    const agg = chargesByKey.get(key);
    if (agg) {
      matchedKeys.add(key);
      matched.push({
        email: l.email,
        name: l.names.join(", "),
        currency: l.currency,
        luma_cents: l.cents,
        stripe_cents: agg.cents,
        stripe_refunded_cents: agg.refunded,
        charge_ids: [...agg.ids].sort(),
        amount_mismatch: agg.cents !== l.cents
      });
    } else {
      noCharge.push({ email: l.email, name: l.names.join(", "), currency: l.currency, luma_cents: l.cents });
    }
  }
  const orphans = Array.from(chargesByKey.entries()).filter(([key]) => !matchedKeys.has(key)).map(([key, agg]) => ({
    email: key.slice(0, key.lastIndexOf("|")),
    charge_id: agg.ids.sort().join(" "),
    currency: key.slice(key.lastIndexOf("|") + 1),
    cents: agg.cents,
    refunded_cents: agg.refunded
  }));
  const totals = /* @__PURE__ */ new Map();
  const bump = (currency, field, cents) => {
    const t = totals.get(currency) ?? { luma: 0, stripe: 0, refunded: 0 };
    t[field] += cents;
    totals.set(currency, t);
  };
  for (const g of guests) {
    if (g.payment !== "paid") continue;
    for (const b of g.captured) bump(b.currency, "luma", b.gross_cents);
  }
  for (const c of lumaCharges) {
    bump((c.currency || "unknown").toLowerCase(), "stripe", c.amount);
    bump((c.currency || "unknown").toLowerCase(), "refunded", c.amount_refunded ?? 0);
  }
  const byKey = (a, b) => a.email.localeCompare(b.email) || a.currency.localeCompare(b.currency);
  return {
    schema: RECONCILE_SCHEMA,
    event,
    since_unix: sinceUnix,
    matched: matched.sort(byKey),
    luma_paid_no_charge: noCharge.sort(byKey),
    charge_no_guest: orphans.sort(byKey),
    unmatchable_guests: unmatchable,
    totals: Array.from(totals.entries()).map(([currency, t]) => ({
      currency,
      luma_captured_cents: t.luma,
      stripe_charged_cents: t.stripe,
      stripe_refunded_cents: t.refunded
    })).sort((a, b) => a.currency.localeCompare(b.currency)),
    charges_scanned: charges.length,
    luma_charges: lumaCharges.length,
    truncated
  };
}
function reconcileHasAnomalies(r) {
  return r.luma_paid_no_charge.length > 0 || r.charge_no_guest.length > 0 || r.matched.some((m) => m.amount_mismatch || m.stripe_refunded_cents > 0) || r.truncated;
}
function renderReconcileMd(r) {
  const lines = [];
  lines.push(`# Stripe reconciliation \u2014 ${mdSafe(r.event.name || r.event.id)}`);
  lines.push("");
  lines.push(
    `Scanned ${r.charges_scanned} charge(s) since unix ${r.since_unix}; ${r.luma_charges} Luma-originated. ${r.matched.length} matched, ${r.luma_paid_no_charge.length} paid guest(s) without a charge, ${r.charge_no_guest.length} charge(s) without a guest.` + (r.unmatchable_guests > 0 ? ` ${r.unmatchable_guests} paid guest(s) had no email to match on.` : "") + (r.truncated ? " \u26A0 charge listing hit the page cap \u2014 results are INCOMPLETE, narrow with --since." : "")
  );
  lines.push("");
  for (const t of r.totals) {
    lines.push(
      `- ${t.currency.toUpperCase()}: Luma captured ${money(t.luma_captured_cents, t.currency)} vs Stripe charged ${money(t.stripe_charged_cents, t.currency)}` + (t.stripe_refunded_cents > 0 ? ` (refunded ${money(t.stripe_refunded_cents, t.currency)})` : "")
    );
  }
  const mismatches = r.matched.filter((m) => m.amount_mismatch || m.stripe_refunded_cents > 0);
  if (mismatches.length > 0) {
    lines.push("");
    lines.push("## Matched with anomalies");
    for (const m of mismatches) {
      const bits = [];
      if (m.amount_mismatch) bits.push(`Luma ${money(m.luma_cents, m.currency)} \u2260 Stripe ${money(m.stripe_cents, m.currency)}`);
      if (m.stripe_refunded_cents > 0) bits.push(`refunded ${money(m.stripe_refunded_cents, m.currency)} on Stripe`);
      lines.push(`- ${mdSafe(m.email)} (${m.charge_ids.map(mdSafe).join(", ")}): ${bits.join("; ")}`);
    }
  }
  if (r.luma_paid_no_charge.length > 0) {
    lines.push("");
    lines.push("## Paid on Luma, no Stripe charge found");
    for (const g of r.luma_paid_no_charge) lines.push(`- ${mdSafe(g.name || g.email)} <${mdSafe(g.email)}> \u2014 ${money(g.luma_cents, g.currency)}`);
  }
  if (r.charge_no_guest.length > 0) {
    lines.push("");
    lines.push("## Luma charges with no matching paid guest (possibly other events)");
    for (const c of r.charge_no_guest) lines.push(`- ${mdSafe(c.email) || "(no email)"} \u2014 ${money(c.cents, c.currency)} (${mdSafe(c.charge_id)})`);
  }
  return lines.join("\n") + "\n";
}

// src/report.ts
var EXIT_WARNINGS = 3;
function writeOut(path, content) {
  const tmp = join3(dirname3(path), `.${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync3(tmp, content, "utf8");
  renameSync(tmp, path);
}
function emit(content, out) {
  if (out) {
    writeOut(out, content);
    if (process.stderr.isTTY) process.stderr.write(`Wrote ${out}
`);
  } else if (content !== "") {
    process.stdout.write(content);
  }
}
function jsonText(value) {
  return JSON.stringify(value, null, 2) + "\n";
}
async function fetchAllEntries(apiKey, path, query) {
  const entries = [];
  let cursor;
  let pages = 0;
  do {
    const q = {};
    for (const [k, v] of Object.entries(query)) if (v !== void 0) q[k] = v;
    if (cursor) q.pagination_cursor = cursor;
    const resp = await callLuma({ apiKey, method: "GET", path, query: q });
    if (Array.isArray(resp)) return resp;
    entries.push(...extractEntries(resp));
    cursor = resp?.has_more ? resp.next_cursor : void 0;
    pages += 1;
    if (pages > 1e3) throw new Error("Pagination safety stop after 1000 pages");
  } while (cursor);
  return entries;
}
async function fetchEventSales(apiKey, eventId) {
  const eventResp = await callLuma({ apiKey, method: "GET", path: "/v1/event/get", query: { id: eventId } });
  const event = normalizeEventInfo(eventResp);
  if (event.id === "") event.id = eventId;
  const ticketTypesResp = await callLuma({
    apiKey,
    method: "GET",
    path: "/v1/event/ticket-types/list",
    query: { event_id: eventId, include_hidden: "true" }
  });
  const rawEntries = await fetchAllEntries(apiKey, "/v1/event/get-guests", { event_id: eventId });
  const guests = normalizeGuests(rawEntries);
  return { summary: buildSalesSummary(event, normalizeTicketTypes(ticketTypesResp), guests, rawEntries), rawEntries };
}
function pickFormat(opts, allowed, fallback) {
  const f = (opts.format ?? fallback).toLowerCase();
  if (!allowed.includes(f)) throw new Error(`--format must be one of: ${allowed.join(", ")}`);
  return f;
}
function registerReportCommands(program2) {
  const report = program2.command("report").description("Read-only reporting for accounting and unattended automation: sales, roster, diff, check");
  report.command("sales").description("Revenue summary: per-currency captured totals, paid/free/uncaptured counts, ticket-type sales + capacity, coupon usage").option("--event-id <evt>", "Event API ID, e.g. evt-XXXX").option("--calendar", "All events on the calendar instead of one event (serial fetch, rate-limit aware)").option("--after <iso>", "Calendar mode: only events starting at/after this ISO timestamp").option("--before <iso>", "Calendar mode: only events starting before this ISO timestamp").option("--format <fmt>", "json (default, machine) | md (human digest)").option("--out <file>", "Write atomically to a file instead of stdout").addHelpText("after", "\nRead-only. Amounts are integer cents as reported by Luma, bucketed per currency (never summed across currencies).\n").action(async (opts) => {
    const apiKey = getApiKey();
    const format = pickFormat(opts, ["json", "md"], "json");
    if (!opts.calendar) {
      if (!opts.eventId) throw new Error("Pass --event-id evt-XXXX, or --calendar for all events.");
      const { summary } = await fetchEventSales(apiKey, opts.eventId);
      emit(format === "md" ? renderSalesMd(summary) : jsonText(summary), opts.out);
      return;
    }
    const eventEntries = await fetchAllEntries(apiKey, "/v1/calendar/list-events", {
      after: opts.after,
      before: opts.before
    });
    const summaries = [];
    for (const entry of eventEntries) {
      const info = normalizeEventInfo(entry);
      if (info.id === "") continue;
      const { summary } = await fetchEventSales(apiKey, info.id);
      summaries.push(summary);
    }
    const calendar = buildCalendarSales({ after: opts.after ?? "", before: opts.before ?? "" }, summaries);
    emit(format === "md" ? renderCalendarSalesMd(calendar) : jsonText(calendar), opts.out);
  });
  report.command("roster").description("Flat per-guest rows for accounting/CRM import (stable columns, deterministic order)").requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX").option("--status <status>", "Server-side approval_status filter: approved|invited|pending_approval|declined|waitlist|session").option("--paid-only", "Only guests with captured payments (is_captured && amount > 0)").option("--format <fmt>", "csv (default) | json (the input format for `report diff`)").option("--out <file>", "Write atomically to a file instead of stdout").action(async (opts) => {
    const apiKey = getApiKey();
    const format = pickFormat(opts, ["csv", "json"], "csv");
    const eventResp = await callLuma({ apiKey, method: "GET", path: "/v1/event/get", query: { id: opts.eventId } });
    const event = normalizeEventInfo(eventResp);
    if (event.id === "") event.id = opts.eventId;
    const rawEntries = await fetchAllEntries(apiKey, "/v1/event/get-guests", {
      event_id: opts.eventId,
      approval_status: opts.status
    });
    let rows = buildRosterRows(normalizeGuests(rawEntries));
    if (opts.paidOnly) rows = rows.filter((r) => r.payment === "paid");
    if (format === "json") {
      emit(jsonText({ schema: ROSTER_SCHEMA, event: { id: event.id, name: event.name }, rows }), opts.out);
    } else {
      emit(toCsv(ROSTER_COLUMNS, rows.map((r) => ROSTER_COLUMNS.map((c) => r[c]))), opts.out);
    }
  });
  report.command("diff").description("Change digest between two roster JSON files (no API calls, no state kept by the CLI)").argument("<old.json>", "Earlier `report roster --format json` output").argument("<new.json>", "Later `report roster --format json` output").option("--format <fmt>", "md (default; prints NOTHING when unchanged \u2014 cron-mail friendly) | json").option("--out <file>", "Write atomically to a file instead of stdout").addHelpText(
    "after",
    "\nTypical scheduled use:\n  luma report roster --event-id evt-X --format json --out today.json\n  luma report diff yesterday.json today.json --format md | your-mail-command\n  mv today.json yesterday.json\n"
  ).action(async (oldPath, newPath, opts) => {
    const format = pickFormat(opts, ["md", "json"], "md");
    const oldDoc = parseRosterDocument(JSON.parse(readFileSync6(oldPath, "utf8")), oldPath);
    const newDoc = parseRosterDocument(JSON.parse(readFileSync6(newPath, "utf8")), newPath);
    const diff = diffRosters(oldDoc, newDoc);
    if (format === "json") {
      emit(jsonText(diff), opts.out);
    } else {
      emit(renderDiffMd(diff), opts.out);
      if (diffIsEmpty(diff) && process.stderr.isTTY) process.stderr.write("No changes.\n");
    }
  });
  report.command("check").description("Automation health check: capacity/sellout + approval-queue aging warnings. Exit 0 = clear, 3 = warnings").requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX").option("--warn-capacity-pct <n>", "Warn when a ticket type reaches this % of max_capacity", "90").option("--warn-pending-hours <n>", "Warn when the oldest pending approval is older than this many hours", "24").option("--format <fmt>", "md (default) | json").option("--out <file>", "Write atomically to a file instead of stdout").action(async (opts) => {
    const apiKey = getApiKey();
    const format = pickFormat(opts, ["md", "json"], "md");
    const { summary } = await fetchEventSales(apiKey, opts.eventId);
    const warnings = computeWarnings(
      summary,
      {
        capacityPct: Number(opts.warnCapacityPct),
        pendingHours: Number(opts.warnPendingHours),
        startSoonHours: 48
      },
      Date.now()
    );
    if (format === "json") {
      emit(jsonText({ schema: "elnora-luma/report-check@1", event: summary.event, warnings }), opts.out);
    } else if (warnings.length > 0) {
      emit(warnings.map((w) => `\u26A0 [${w.code}] ${w.message}`).join("\n") + "\n", opts.out);
    } else {
      emit("", opts.out);
      if (process.stderr.isTTY) process.stderr.write(`OK \u2014 no warnings for ${summary.event.name || summary.event.id}.
`);
    }
    if (warnings.length > 0) process.exitCode = EXIT_WARNINGS;
  });
}
function registerStripeCommands(program2) {
  const stripe = program2.command("stripe").description("Read-only Stripe cross-checks (organizer's own Stripe account; needs STRIPE_API_KEY, use a restricted rk_ key)");
  stripe.command("reconcile").description("Match this event's Luma paid guests against Luma-originated charges in your Stripe account (email-keyed, read-only)").requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX").option("--since <iso>", "Only scan Stripe charges created at/after this ISO timestamp (default: the event's created_at)").option("--check", "Exit 3 when anomalies are found (unmatched guests/charges, amount mismatches, refunds, truncation)").option("--format <fmt>", "md (default) | json").option("--out <file>", "Write atomically to a file instead of stdout").addHelpText(
    "after",
    "\nLuma stamps `metadata.luma_payment_started_api_id` on charges it creates in your connected Stripe account (observed, undocumented). Charges are account-wide: an unmatched charge may belong to another event \u2014 narrow with --since. Matching is by email only.\n"
  ).action(async (opts) => {
    const apiKey = getApiKey();
    const stripeKey = getStripeKey();
    const format = pickFormat(opts, ["md", "json"], "md");
    const eventResp = await callLuma({ apiKey, method: "GET", path: "/v1/event/get", query: { id: opts.eventId } });
    const outer = eventResp ?? {};
    const ev = typeof outer.event === "object" && outer.event !== null ? outer.event : outer;
    const event = normalizeEventInfo(eventResp);
    if (event.id === "") event.id = opts.eventId;
    let sinceIso = opts.since ?? (typeof ev.created_at === "string" ? ev.created_at : "");
    if (sinceIso === "" && event.start_at !== "") {
      const startMs = Date.parse(event.start_at);
      if (Number.isFinite(startMs)) sinceIso = new Date(startMs - 90 * 24 * 36e5).toISOString();
    }
    const sinceMs = Date.parse(sinceIso);
    if (!Number.isFinite(sinceMs)) {
      throw new Error("Could not derive a charge window \u2014 pass --since <iso>, e.g. --since 2030-01-01T00:00:00Z");
    }
    const sinceUnix = Math.floor(sinceMs / 1e3);
    const rawEntries = await fetchAllEntries(apiKey, "/v1/event/get-guests", { event_id: opts.eventId });
    const guests = normalizeGuests(rawEntries);
    const { charges, truncated } = await listCharges(stripeKey, sinceUnix);
    const reportDoc = reconcile({ id: event.id, name: event.name }, guests, charges, sinceUnix, truncated);
    emit(format === "json" ? jsonText(reportDoc) : renderReconcileMd(reportDoc), opts.out);
    if (opts.check && reconcileHasAnomalies(reportDoc)) process.exitCode = EXIT_WARNINGS;
  });
}

// src/main.ts
var __dirname = dirname4(fileURLToPath3(import.meta.url));
var SPEC_PATH = resolve3(__dirname, "spec", "openapi.json");
var SRC_SPEC_PATH = resolve3(__dirname, "..", "src", "spec", "openapi.json");
var PKG_PATH2 = resolve3(__dirname, "..", "package.json");
var pkg = JSON.parse(readFileSync7(PKG_PATH2, "utf8"));
function describeParam(p) {
  const bits = [];
  if (p.required) bits.push("(required)");
  if (p.description) bits.push(p.description.replace(/\s+/g, " ").trim());
  if (p.enumValues && p.enumValues.length > 0 && p.enumValues.length < 10) {
    bits.push(`one of: ${p.enumValues.join("|")}`);
  }
  return bits.join(" ").slice(0, 250);
}
var HAZARD_WARNINGS = {
  "event.add-guests": "\u26A0 HAZARD: `add-guests` is the COMP-VIP endpoint. It bypasses BOTH payment and approval. Every guest is added with status 'Going' and a comped ticket of the default (lowest position) ticket type. To 'invite' people who should pay or be approved, share the public event URL or use `send-invites` instead. See `luma:guests` SKILL.",
  "event.send-invites": "\u26A0 EMAIL: `send-invites` sends Luma-branded invite emails. Recipients are auto-approved (bypasses approval queue) but DO have to pay on paid tickets. Confirm recipient list + intent with the user before sending.",
  "event.update-guest-status": "\u26A0 EMAIL: `update-guest-status` fires an email to the guest on both `approved` and `declined`. Always test on ONE address the user controls first; verify email behavior; then batch SERIAL with \u22651.2s sleeps (parallel >2 trips 429 fast). Rate limit: 200 req/min.",
  "event.ticket-types-delete": "\u26A0 HAZARD: Deleting a ticket type orphans pre-assignments of any `invited` guests who had it as their default ticket. It also fails if the event would be left with zero VISIBLE ticket types (Luma 400). Confirm intent + read `luma:ticketing` SKILL before proceeding.",
  "event.cancel": "\u26A0 EMAIL: Cancelling fires a notification to every approved guest. Confirm `--should-refund` decision first if paid_guest_count > 0.",
  "event.update-coupon": "\u26A0 SILENT: coupon discount terms are immutable after creation. Passing a new `discount` returns HTTP 200 `{}` and changes NOTHING \u2014 no error. Only code, remaining_count, and validity dates can change. To change the discount: retire the old code (remaining_count: 0) and create a new one. See `luma:ticketing` SKILL.",
  "calendar.coupons-update": "\u26A0 SILENT: coupon discount terms are immutable after creation. Passing a new `discount` returns HTTP 200 `{}` and changes NOTHING \u2014 no error. Only code, remaining_count, and validity dates can change. To change the discount: retire the old code (remaining_count: 0) and create a new one. See `luma:ticketing` SKILL."
};
function hazardKey(op) {
  const m = op.path.match(/^\/v1\/([^/]+)/);
  return `${m?.[1] ?? ""}.${op.action}`;
}
function registerOperation(parent, op) {
  const sub = parent.command(op.action).description(`${op.method} ${op.path}${op.summary ? ` \u2014 ${op.summary}` : ""}`);
  for (const p of op.params) {
    const flag = `--${snakeToKebab(p.name)} <${p.type}>`;
    sub.option(flag, describeParam(p));
  }
  if (op.method !== "GET") {
    for (const bp of op.bodyProps) {
      const flag = `--${snakeToKebab(bp.name)} <${bp.type}>`;
      sub.option(flag, describeParam(bp));
    }
    sub.option(
      "--body <json>",
      "JSON request body. Pass literal JSON, @file.json, or - to read stdin. Required when the body has nested objects/arrays."
    );
  }
  sub.option("--all", "Auto-paginate list responses by following has_more / next_cursor");
  sub.option("--search <term>", "Client-side filter: keep entries where any string field contains the term (space-separated terms are AND-matched)");
  sub.option("--raw", "One-line compact JSON instead of pretty-printed");
  const hazard = HAZARD_WARNINGS[hazardKey(op)];
  if (hazard) {
    sub.addHelpText("after", `
${hazard}
`);
  }
  sub.action(async (opts) => {
    if (hazard) {
      process.stderr.write(`${hazard}
`);
    }
    await dispatch(op, opts);
  });
}
async function main() {
  loadEnv();
  const program2 = new Command();
  program2.name("luma").version(pkg.version).description(
    `Luma API CLI \u2014 covers every endpoint from public-api.luma.com.

Auth: LUMA_API_KEY from the environment, ~/.config/elnora-luma/.env, or a .env next to the CLI.
First run: \`luma auth set-key <key>\` (generate a key at https://luma.com/calendar/manage/api-keys \u2014 requires Luma Plus).
Each key is scoped to a single calendar.

Resources are discovered dynamically from the bundled OpenAPI spec. Run \`luma <resource>\` to list its actions, or \`luma <resource> <action> --help\` for the full flag list.`
  );
  program2.command("whoami").description("Show the authenticated user (alias for `luma user get-self`)").option("--raw", "Compact JSON output").action(async (opts) => {
    await dispatch(
      {
        resource: "user",
        action: "get-self",
        method: "GET",
        path: "/v1/user/get-self",
        params: [],
        bodyProps: []
      },
      opts
    );
  });
  registerAuthCommands(program2);
  registerReportCommands(program2);
  registerStripeCommands(program2);
  const specGroup = program2.command("spec").description("OpenAPI spec utilities");
  specGroup.command("refresh").description("Re-download the bundled openapi.json from public-api.luma.com").action(async () => {
    await refreshSpec(SPEC_PATH);
    try {
      await refreshSpec(SRC_SPEC_PATH);
      process.stderr.write(`Refreshed ${SPEC_PATH}
           and ${SRC_SPEC_PATH}
`);
    } catch {
      process.stderr.write(`Refreshed ${SPEC_PATH} (could not update src/ \u2014 fine if running from a production install)
`);
    }
  });
  specGroup.command("path").description("Print the local path to the bundled openapi.json").action(() => {
    process.stdout.write(SPEC_PATH + "\n");
  });
  const resourceMap = buildResourceMap(SPEC_PATH);
  const sortedResources = Array.from(resourceMap.keys()).sort();
  for (const resource of sortedResources) {
    const operations = resourceMap.get(resource);
    const group = program2.command(resource).description(`${operations.length} actions: ${operations.map((o) => o.action).join(", ")}`);
    for (const op of operations) {
      registerOperation(group, op);
    }
  }
  const eventGroup = program2.commands.find((c) => c.name() === "event");
  if (eventGroup) registerAdminCommands(eventGroup);
  program2.addHelpText(
    "after",
    `
Examples:
  luma whoami                                       # who is this API key?
  luma calendar get                                 # current calendar
  luma calendar list-events                         # list events on the calendar
  luma calendar list-events --all                   # auto-paginate
  luma event get --api-id evt-XXXX                  # event detail
  luma event get-guests --event-api-id evt-XXXX     # guest list
  luma event add-guests --body @guests.json         # complex body from file
  echo '{"event_id":"evt-X","guests":[...]}' | luma event add-guests --body -
  luma webhooks list
  luma spec refresh                                 # update the bundled OpenAPI spec

Automation (read-only, cron-safe \u2014 see docs/automation.md):
  luma report sales --event-id evt-XXXX --format md   # revenue summary digest
  luma report roster --event-id evt-XXXX --out r.csv  # accounting/CRM export
  luma report diff yesterday.json today.json          # what changed since last run
  luma report check --event-id evt-XXXX               # capacity/queue warnings (exit 3)
  luma stripe reconcile --event-id evt-XXXX           # Luma paid guests vs Stripe charges
`
  );
  await program2.parseAsync(process.argv);
}
main().catch((err) => {
  printError(err);
  process.exit(1);
});
