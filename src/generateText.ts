import * as vscode from "vscode";
import { getTranslate, language } from "./language";
const fs = require("fs");
const path = require("path");

export const generateText = async (values: any) => {
  const config = vscode.workspace.getConfiguration("usum-generate-i18");

  const activeEditor = vscode.window.activeTextEditor!;

  const { document, selection } = values;
  const range: vscode.Range = new vscode.Range(selection.start, selection.end);

  const { linkFolder } = config;
  const { rootPath } = vscode.workspace;

  const textSelected = activeEditor.document.getText(range);
  let arrValue = textSelected.split(".");

  try {
    const lang = await showInputBox();

    let newArrValue: string[] = await translateInput(arrValue, lang!);

    newArrValue = formatString(newArrValue);

    let [filename, ...arrObj] = newArrValue;

    const realPath = path.join(rootPath, linkFolder, `${filename}.json`);

    const jsonValue: Record<string, any> = convertArrayToNestedOject(arrObj);

    const jsonData = readFile(realPath);
    const newJson = concatObject(jsonData, jsonValue);

    editEditor(document, range, newArrValue.join("."));

    const content = JSON.stringify(newJson, null, 2);
    writeFile(realPath, content);

    vscode.window.showInformationMessage("Successfully generated 😍");
  } catch (error) {
    vscode.window.showErrorMessage("Error !!!");
  }
};

const concatObject: any = (
  parent: Record<string, any>,
  child: Record<string, any>
) => {
  const keys1 = Object.keys(parent);
  const keys2 = Object.keys(child);

  const checkKeyLoop = keys2.find((value1) =>
    keys1.find((value2) => value1 === value2)
  );

  if (checkKeyLoop) {
    if (typeof parent[checkKeyLoop] === "object") {
      return {
        ...parent,
        [checkKeyLoop]: {
          ...parent[checkKeyLoop],
          ...concatObject(parent[checkKeyLoop], child[checkKeyLoop]),
        },
      };
    }
  }
  return { ...parent, ...child };
};

const editEditor = (
  document: vscode.TextDocument,
  range: vscode.Range,
  text: string
) => {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, range, text);

  vscode.workspace.applyEdit(edit);
};

const showInputBox = async () => {
  return await vscode.window.showInputBox({
    value: "en",
    placeHolder: "Select the language you want to convert",
    validateInput: (text) => {
      return language.includes(text)
        ? null
        : `Cannot switch to language \"${text}\"`;
    },
  });
};

const translateInput = async (arrValue: string[], lang: string) => {
  return await Promise.all<any>(
    await arrValue.map(async (value) =>
      value.includes("|")
        ? await getTranslate(value.replaceAll("|", ""), lang!)
        : value
    )
  );
};

const formatString = (arr: string[]) => {
  return arr.map((value) => value.toLocaleLowerCase().split(" ").join("-"));
};

const convertArrayToNestedOject = (arr: string[]) => {
  return arr
    .reduce((arr: string[], value) => [value, ...arr], [])
    .reduce(
      (obj: any, value) =>
        !Object.keys(obj).length ? { [value]: value } : { [value]: obj },
      {}
    );
};

const readFile = (path: string) => {
  let jsonFile = fs.readFileSync(path, { flag: "w+" });
  return !jsonFile.length ? {} : JSON.parse(jsonFile);
};

const writeFile = (path: string, content: string) => {
  fs.writeFileSync(path, content, {
    flag: "w+",
  });
};
