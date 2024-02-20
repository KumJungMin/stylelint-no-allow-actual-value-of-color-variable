import stylelint from "stylelint";
import valueParser from "postcss-value-parser";

const meta = {
  url: "https://github.com/KumJungMin/stylelint-css-variable-check/README.md",
};

const ruleName = "stylelint/no-allow-actual-value-of-variable";

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const messages = ruleMessages(ruleName, {
  rejected: ({ prop, value }) => {
    return `Do not use actual value of color variable. (${prop}: ${value})`;
  },
});

/** @type {import('stylelint').Rule} */

const ruleFunction = (primary, secondaryOptions = { range: "global" }) => {
  return (root, result) => {
    const validOptions = validateOptions(result, ruleName, {
      actual: primary,
      possible: [true],
    });

    if (!validOptions) return;
    let ancestorValueMap = collectScopeValueMap(root);
    const rootVars = collectRootVariables(root);
    if (secondaryOptions.range !== "local") {
      ancestorValueMap = { ...rootVars, ...ancestorValueMap };
    }
    root.walkDecls((decl) => {
      const parsedValue = valueParser(decl.value);

      parsedValue.walk((node) => {
        const { value } = node;

        const index = declarationValueIndex(decl) + node.sourceIndex;
        const endIndex = index + value.length;
        // TODO: isError 변수명 변경 및 조건 재체크하기
        const isError =
          !!ancestorValueMap[value] && ancestorValueMap[value] !== decl.prop;
        if (isError) {
          report({
            // TODO: message, messageArgs 인자 수정하기
            message: messages.rejected({
              prop: ancestorValueMap[value],
              value,
            }),
            messageArgs: [value],
            node: decl,
            index,
            endIndex,
            result,
            ruleName,
          });
        }
      });
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default createPlugin(ruleName, ruleFunction);

// TODO: 하단 코드를 별도 파일로 분리하기
function isObject(value) {
  return value !== null && typeof value === "object";
}

function isString(value) {
  return typeof value === "string" || value instanceof String;
}

function declarationValueIndex(decl) {
  const raws = decl.raws;
  const prop = raws.prop;

  return [
    isObject(prop) && "prefix" in prop && prop.prefix,
    (isObject(prop) && "raw" in prop && prop.raw) || decl.prop,
    isObject(prop) && "suffix" in prop && prop.suffix,
    raws.between || ":",
    raws.value && "prefix" in raws.value && raws.value.prefix,
  ].reduce((count, str) => {
    if (isString(str)) return count + str.length;

    return count;
  }, 0);
}

function isColorVariable({ prop, value }) {
  return isVariable(prop) && isColor(value);
}

function isVariable(value) {
  return value.startsWith("--") || value.startsWith("$");
}

function isColor(value) {
  return value.startsWith("#") || value.startsWith("rgb");
}

// TODO: 반복 호출 코드 제거하기
function collectScopeValueMap(root) {
  const map = {};

  root.walkRules((node) => {
    let parent = node.parent;
    while (parent !== null && parent !== undefined) {
      for (const node of parent.nodes) {
        const isDeclared = node.type === "decl" && node?.value && node?.prop;
        if (
          isDeclared &&
          isColorVariable({ prop: node.prop, value: node.value })
        ) {
          map[node.value] = node.prop;
        }
      }
      parent = parent.parent;
    }
  });
  return map;
}

function collectRootVariables(root) {
  const rootVars = {};

  root.walkRules((rule) => {
    const globalSelectors = [":root", "html", "body"];
    const isGlobal = globalSelectors.includes(rule.selector.toLowerCase());
    if (isGlobal) {
      rule.walkDecls((decl) => {
        if (isColorVariable({ prop: decl.prop, value: decl.value })) {
          rootVars[decl.value] = decl.prop;
        }
      });
    }
  });

  return rootVars;
}
