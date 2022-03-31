import * as vscode from "vscode";
import { getTranslate, language } from "./language";

const fs = require("fs");
const path = require("path");

export const generateFile = async () => {
  const textEditor = vscode.window.activeTextEditor;

  if (!textEditor) {
    vscode.window.showInformationMessage(
      "Please select the file you want to generate !"
    );
    return;
  }

  const pathName = textEditor?.document.fileName;
  let file: any = pathName.split("\\");
  file = (file[file.length - 1] as String).split(".");
  const [name, type] = file;

  if (type !== "json") {
    vscode.window.showInformationMessage(
      "Extension only works on json files !"
    );
    return;
  }

  const lang = await vscode.window.showInputBox({
    value: "en",
    placeHolder: "Select the language you want to convert",
    validateInput: (text) => {
      return language.includes(text)
        ? null
        : `Cannot switch to language \"${text}\"`;
    },
  });

  if (!lang) {
    vscode.window.showInformationMessage("Exit !!!");
    return;
  }

  let pathRecrement = path.join(pathName, "..", "..", lang, `${name}.json`);

  const pathNew = await vscode.window.showInputBox({
    value: pathRecrement,
    placeHolder: "Please select the output file location",
  });

  if (!pathNew) {
    vscode.window.showInformationMessage("Exit !!!");
    return;
  }

  const data = await handleTranslate(pathName, lang);
  fs.writeFileSync(pathNew, JSON.stringify(data, null, 2), { flag: "w+" });
};

const handleTranslateJson = async (jsonData: any, toLanguage: string) => {
  if (!jsonData) return;

  for (let key in jsonData) {
    if (typeof jsonData[key] === "string")
      jsonData[key] = await getTranslate(jsonData[key], toLanguage, true);
    else if (typeof jsonData[key] === "object") {
      await handleTranslateJson(jsonData[key], toLanguage);
    }
  }

  vscode.window.showInformationMessage(` ❤🧡💛💚  Done  💙💜🤎🖤`);
};

const handleTranslate = async (filePath: string, toLanguage: string) => {
  const jsonFile = fs.readFileSync(filePath);
  const jsonData = JSON.parse(jsonFile);
  await handleTranslateJson(jsonData, toLanguage);

  return jsonData;
};
