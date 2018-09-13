"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const intents = require("@bearer/intents");
const templates = require("@bearer/templates");
const Case = require("case");
const copy = require("copy-template-dir");
const inquirer = require("inquirer");
const path = require("path");
const generate_1 = require("./generate");
const INTENT = 'intent';
const COMPONENT = 'component';
const generate = (emitter, {}, locator) => (env) => __awaiter(this, void 0, void 0, function* () {
    const { scenarioRoot } = locator;
    if (!scenarioRoot) {
        emitter.emit('rootPath:doesntExist');
        process.exit(1);
    }
    if (env.setup) {
        return generate_1.generateSetup({ emitter, locator });
    }
    if (env.blankComponent && typeof env.blankComponent === 'string') {
        return generateComponent({ emitter, locator, name: env.blankComponent, type: "blank" /* BLANK */ });
    }
    if (env.blankComponent) {
        return generateComponent({ emitter, locator, type: "blank" /* BLANK */ });
    }
    if (env.collectionComponent && typeof env.collectionComponent === 'string') {
        return generateComponent({ emitter, locator, name: env.collectionComponent, type: "collection" /* COLLECTION */ });
    }
    if (env.collectionComponent) {
        return generateComponent({ emitter, locator, type: "collection" /* COLLECTION */ });
    }
    if (env.rootGroup && typeof env.rootGroup === 'string') {
        return generateComponent({ emitter, locator, name: env.rootGroup, type: "root" /* ROOT */ });
    }
    if (env.rootGroup) {
        return generateComponent({ emitter, locator, type: "root" /* ROOT */ });
    }
    const { template } = yield inquirer.prompt([
        {
            message: 'What do you want to generate',
            type: 'list',
            name: 'template',
            choices: [{ name: 'Intent', value: INTENT }, { name: 'Component', value: COMPONENT }]
        }
    ]);
    const params = { emitter, locator };
    switch (template) {
        case INTENT:
            yield generateIntent(params);
            break;
        case COMPONENT:
            yield generateComponent(params);
            break;
        default:
    }
});
function generateComponent({ emitter, locator, name, type }) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ask for type if not present
        if (!type) {
            type = yield askComponentType();
        }
        // Ask for name if not present
        if (!name) {
            name = yield askForName();
        }
        const inDir = path.join(__dirname, 'templates/generate', `${type}Component`);
        const outDir = type === "root" /* ROOT */ ? locator.srcViewsDir : locator.srcViewsDirResource('components');
        copy(inDir, outDir, getComponentVars(name, require(locator.authConfigPath)), (err, createdFiles) => {
            if (err)
                throw err;
            createdFiles.forEach(filePath => emitter.emit('generateView:fileGenerated', filePath));
        });
    });
}
function generateIntent({ emitter, locator }) {
    return __awaiter(this, void 0, void 0, function* () {
        const intentType = yield askIntentType();
        const name = yield askForName();
        const authConfig = require(locator.authConfigPath);
        const inDir = path.join(__dirname, 'templates/generate/intent');
        const outDir = locator.srcIntentsDir;
        copy(inDir, outDir, getIntentVars(name, intentType, authConfig), (err, createdFiles) => {
            if (err)
                throw err;
            createdFiles.forEach(filePath => emitter.emit('generateTemplate:fileGenerated', filePath));
        });
    });
}
/**
 * Helpers
 */
function getIntentChoices() {
    const filteredChoices = (intents, propertyFlag) => Object.keys(intents)
        .filter(intent => intents[intent][propertyFlag])
        .map(intent => ({
        name: intents[intent].display,
        value: intent
    }))
        .sort((a, b) => (a.name > b.name ? 1 : -1));
    return [
        ...filteredChoices(intents, 'isGlobalIntent'),
        new inquirer.Separator(),
        ...filteredChoices(intents, 'isStateIntent')
    ];
}
exports.getIntentChoices = getIntentChoices;
function getActionExample(intentType, authType) {
    return templates[authType][intentType];
}
function askIntentType() {
    return __awaiter(this, void 0, void 0, function* () {
        const { intentType } = yield inquirer.prompt([
            {
                message: 'What type of intent do you want to generate',
                type: 'list',
                name: 'intentType',
                choices: getIntentChoices()
            }
        ]);
        return intentType;
    });
}
function askComponentType() {
    return __awaiter(this, void 0, void 0, function* () {
        const typePrompt = yield inquirer.prompt([
            {
                message: 'What type of component do you want to generate',
                type: 'list',
                name: 'type',
                choices: [
                    { name: 'Blank', value: "blank" /* BLANK */ },
                    { name: 'Collection', value: "collection" /* COLLECTION */ },
                    new inquirer.Separator(),
                    { name: 'Root Group', value: "root" /* ROOT */ }
                ]
            }
        ]);
        return typePrompt.type;
    });
}
function getComponentVars(name, authConfig) {
    const componentName = Case.pascal(name);
    return {
        fileName: name,
        componentName,
        componentClassName: componentName,
        componentTagName: Case.kebab(componentName),
        groupName: Case.kebab(componentName),
        withAuthScreen: authConfig.authType === 'oauth2' ? '<bearer-navigator-auth-screen />' : null
    };
}
exports.getComponentVars = getComponentVars;
function getIntentVars(name, intentType, authConfig) {
    const actionExample = getActionExample(intentType, authConfig.authType);
    return {
        fileName: name,
        intentName: name,
        intentClassName: Case.pascal(name),
        authType: authConfig.authType,
        intentType,
        actionExample,
        callbackType: `T${intentType}Callback`
    };
}
exports.getIntentVars = getIntentVars;
function askForName() {
    return __awaiter(this, void 0, void 0, function* () {
        const { name } = yield inquirer.prompt([{ message: 'Give it a name', type: 'input', name: 'name' }]);
        return name.trim();
    });
}
/**
 * Command
 */
function useWith(program, emitter, config, locator) {
    program
        .command('generate')
        .alias('g')
        .description(`Generate intent or component.
    $ bearer generate
  `)
        // .option('-t, --type <intentType>', 'Intent type.')
        .option('--blank-component [name]', 'generate blank component')
        .option('--collection-component [name]', 'generate collection component')
        .option('--root-group [name]', 'generate root components group')
        .option('--setup', 'generate setup file')
        .action(generate(emitter, config, locator));
}
exports.useWith = useWith;
