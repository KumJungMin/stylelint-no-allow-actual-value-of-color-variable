import { testRule } from "stylelint-test-rule-node";
import plugin from "./index.js";

const {
  rule: { messages, ruleName },
} = plugin;

testRule({
  plugins: [plugin],
  ruleName,
  config: true,
  fix: false, // TODO: fix 옵션 추가하기

  accept: [
    {
      code: `
      --red: #1111ff;
      a {
        color: var(--red);
      }
    `,
    },

    {
      code: `
        :root {
          --white: #f2fe;
          --pink: #ff00ff;
        }
        $white: #ffffff;
        --blue: #0000ff;
        a {
          color: var(--blue);
        }
      `,
    },
  ],

  reject: [
    {
      code: `
      --blue: #0000ff;
      a {
        color: #0000ff;
      }
    `,
      message: messages.rejected({ prop: "--blue", value: "#0000ff" }),
      line: 4,
      column: 16,
    },
  ],
});
