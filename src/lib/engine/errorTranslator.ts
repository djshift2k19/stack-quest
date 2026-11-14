/**
 * The plain-English error translator.
 *
 * Programs report problems with terse messages written for experts, such as
 * "TypeError: Cannot read properties of undefined (reading 'name')".
 * This file matches common messages with patterns (called "regular
 * expressions") and returns a friendly explanation plus where to look.
 * The real message is always shown too, so you learn to read it yourself.
 */

export interface ErrorInfo {
  /** e.g. "ReferenceError" */
  name: string;
  message: string;
  /** The line in the learner's code, if known (1 = first line). */
  line?: number;
}

export interface Translation {
  title: string;
  explanation: string;
  whereToLook: string;
}

type Rule = {
  pattern: RegExp;
  translate: (m: RegExpMatchArray, err: ErrorInfo) => Translation;
};

const at = (err: ErrorInfo) => (err.line ? `Look at line ${err.line}` : "Look through your code");

const JS_RULES: Rule[] = [
  {
    pattern: /^(\w+) is not defined$/,
    translate: (m, e) => ({
      title: `JavaScript doesn't know the name "${m[1]}"`,
      explanation: `The code uses "${m[1]}", but nothing with that name has been created yet. Usually it's a typo (names are case-sensitive: "total" and "Total" are different), or the variable is created later or inside a different block.`,
      whereToLook: `${at(e)}. Check the spelling of "${m[1]}", and check that it's created (with let, const or function) before it's used.`,
    }),
  },
  {
    pattern: /^Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/,
    translate: (m, e) => ({
      title: `Trying to look inside something that is ${m[1]}`,
      explanation: `The code asked for ${m[2] ? `".${m[2]}"` : "a property"} on a value that is ${m[1]}, meaning "nothing here". It's like asking for the colour of a box that doesn't exist.`,
      whereToLook: `${at(e)}. Find what comes just before ${m[2] ? `".${m[2]}"` : "the dot"} and work out why it's ${m[1]}. Is it spelled right? Was it given a value?`,
    }),
  },
  {
    pattern: /^(.+) is not a function$/,
    translate: (m, e) => ({
      title: `"${m[1]}" can't be called like a function`,
      explanation: `Putting () after a name means "run this function". But "${m[1]}" isn't a function. It might be a typo, a number or text, or a function that doesn't exist under that name.`,
      whereToLook: `${at(e)}. Check the spelling, and check that "${m[1]}" really is a function.`,
    }),
  },
  {
    pattern: /^Assignment to constant variable\.?$/,
    translate: (_m, e) => ({
      title: "Changing a value that was locked with const",
      explanation: "A variable made with const can't be given a new value later. Use let if the value needs to change.",
      whereToLook: `${at(e)}. Find where the variable is created with const, and change it to let if it should change.`,
    }),
  },
  {
    pattern: /^Identifier '([^']+)' has already been declared$/,
    translate: (m, e) => ({
      title: `"${m[1]}" is created twice`,
      explanation: `You can only create a name with let or const once in the same block. The second time, just use it, without let or const in front.`,
      whereToLook: `${at(e)}. Search for every "let ${m[1]}" and "const ${m[1]}" and keep only the first.`,
    }),
  },
  {
    pattern: /^Unexpected end of input$/,
    translate: () => ({
      title: "The code stops before it's finished",
      explanation: "JavaScript reached the end of your code while still waiting for something to be closed, usually a } or a ).",
      whereToLook: "Count your brackets: every { needs a matching }, and every ( needs a matching ). Look near the end of your code.",
    }),
  },
  {
    pattern: /^Invalid or unexpected token$|^Unterminated string/,
    translate: (_m, e) => ({
      title: "Something here isn't valid JavaScript",
      explanation: "Often a piece of text (a string) has an opening quote mark but no closing one, or a curly ‘smart quote’ has been pasted in instead of a straight one.",
      whereToLook: `${at(e)}. Check that every " or ' has a matching partner on the same line.`,
    }),
  },
  {
    pattern: /^missing \) after argument list$/,
    translate: (_m, e) => ({
      title: "A bracket ) is missing",
      explanation: "A function call was opened with ( but JavaScript couldn't find where it closes. Sometimes a comma or quote mark is missing inside it too.",
      whereToLook: `${at(e)}. Find the ( on that line and make sure it has a matching ).`,
    }),
  },
  {
    pattern: /^Unexpected token '?([^']*)'?/,
    translate: (m, e) => ({
      title: `JavaScript didn't expect "${m[1]}" here`,
      explanation: "The code's punctuation doesn't follow JavaScript's grammar at this spot. Common causes are a missing comma, an extra bracket, or a missing quote mark.",
      whereToLook: `${at(e)}. Look just before "${m[1]}": something is usually missing or extra there.`,
    }),
  },
  {
    pattern: /^Maximum call stack size exceeded$/,
    translate: () => ({
      title: "A function keeps calling itself forever",
      explanation: "A function called itself (or two functions called each other) over and over without stopping, until the computer ran out of room.",
      whereToLook: "Find the function that calls itself and make sure there's a condition that makes it stop.",
    }),
  },
];

const SQL_RULES: Rule[] = [
  {
    pattern: /^relation "([^"]+)" does not exist/,
    translate: (m) => ({
      title: `There's no table called "${m[1]}"`,
      explanation: "The query asks for a table the database doesn't have. Check the spelling. Table names are usually lowercase and often plural.",
      whereToLook: `Find "${m[1]}" after FROM or JOIN and compare it with the table names in the task.`,
    }),
  },
  {
    pattern: /^column "([^"]+)" does not exist/,
    translate: (m) => ({
      title: `There's no column called "${m[1]}"`,
      explanation: `The query mentions a column the table doesn't have. It might be a typo, or the column might live in a different table. If you meant the text '${m[1]}', text values need single quotes in SQL.`,
      whereToLook: `Find "${m[1]}" in your query and check it against the table's columns.`,
    }),
  },
  {
    pattern: /^syntax error at or near "([^"]+)"/,
    translate: (m) => ({
      title: `The database didn't understand the query near "${m[1]}"`,
      explanation: "Part of the query doesn't follow SQL's grammar. Common causes are a missing comma between columns, a keyword in the wrong order (it's SELECT … FROM … WHERE … ORDER BY), or a missing quote mark.",
      whereToLook: `Look just before "${m[1]}" in your query.`,
    }),
  },
  {
    pattern: /^syntax error at end of input/,
    translate: () => ({
      title: "The query stops before it's finished",
      explanation: "The database reached the end while expecting more, often after a dangling comma, AND, or an unclosed bracket.",
      whereToLook: "Look at the very end of your query.",
    }),
  },
  {
    pattern: /must appear in the GROUP BY clause or be used in an aggregate function/,
    translate: () => ({
      title: "Mixing grouped and ungrouped columns",
      explanation: "When you use GROUP BY (or COUNT, SUM and similar), every column in SELECT must either be in the GROUP BY list or be inside one of those functions.",
      whereToLook: "Compare the columns after SELECT with the ones after GROUP BY.",
    }),
  },
  {
    pattern: /^null value in column "([^"]+)".*violates not-null constraint/,
    translate: (m) => ({
      title: `"${m[1]}" can't be left empty`,
      explanation: `This table requires a value for "${m[1]}", but the row being saved doesn't have one.`,
      whereToLook: `Add "${m[1]}" and a value to your INSERT.`,
    }),
  },
  {
    pattern: /^duplicate key value violates unique constraint/,
    translate: () => ({
      title: "That value already exists",
      explanation: "This column only allows each value once (like ID numbers), and the value you're saving is already used.",
      whereToLook: "Use a different value, or update the existing row instead of inserting a new one.",
    }),
  },
];

const TERMINAL_RULES: Rule[] = [
  {
    pattern: /command not found: (\S+)/,
    translate: (m) => ({
      title: `The terminal doesn't know a command called "${m[1]}"`,
      explanation: "The first word you type is the command. This one isn't a command the terminal recognises, usually because of a typo or a missing space.",
      whereToLook: `Check the spelling of "${m[1]}". Type help to see the commands you can practise here.`,
    }),
  },
  {
    pattern: /^(?:cd|ls|cat|rm|mv|cp|touch|mkdir): (.+?): No such file or directory$|^cd: no such file or directory: (.+)$/,
    translate: (m) => ({
      title: `There's nothing called "${m[1] ?? m[2]}" here`,
      explanation: "The command looked for that name in the folder you're standing in (or along the path you gave) and found nothing. Names are case-sensitive: Documents and documents are different.",
      whereToLook: "Type pwd to see where you are and ls to see what's here. Then check the spelling and capital letters.",
    }),
  },
  {
    pattern: /File exists$/,
    translate: () => ({
      title: "Something with that name already exists",
      explanation: "You can't make two things with the same name in the same folder.",
      whereToLook: "Type ls to see what's already here, then pick a different name, or use the one that exists.",
    }),
  },
  {
    pattern: /is a directory/i,
    translate: () => ({
      title: "That's a folder, not a file",
      explanation: "This command works on files. To delete a folder and everything inside it, use rm -r (carefully!). To look inside a folder, use ls or cd.",
      whereToLook: "Check whether the name you typed is a folder (ls shows folders with a / at the end here).",
    }),
  },
  {
    pattern: /not a directory/,
    translate: () => ({
      title: "That's a file, not a folder",
      explanation: "You can only cd into folders. Files are opened or read instead, for example with cat.",
      whereToLook: "Type ls to check which names are folders (they end with /).",
    }),
  },
  {
    pattern: /fatal: not a git repository/,
    translate: () => ({
      title: "Git isn't tracking this folder yet",
      explanation: "Git commands only work inside a folder where Git has been switched on with git init (or one of the folders inside it).",
      whereToLook: "Type pwd to check you're in your project folder. If you are, run git init first.",
    }),
  },
  {
    pattern: /nothing added to commit but untracked files present/,
    translate: () => ({
      title: "Nothing has been added for this snapshot yet",
      explanation: "A commit saves what's in the staging area, and it's empty. Your files exist, but you haven't told Git to include them.",
      whereToLook: "Run git add with the file name (or git add . for everything), then commit again.",
    }),
  },
  {
    pattern: /nothing to commit/,
    translate: () => ({
      title: "There's nothing new to save",
      explanation: "Everything is already saved in the last commit. Change or add a file first.",
      whereToLook: "Run git status: it tells you what (if anything) has changed.",
    }),
  },
  {
    pattern: /pathspec '(.+?)' did not match any files/,
    translate: (m) => ({
      title: `Git can't find "${m[1]}"`,
      explanation: "git add needs the name of a file (or folder) that exists here.",
      whereToLook: "Type ls to check the exact name, including capitals and the extension (like .txt).",
    }),
  },
  {
    pattern: /add a message with -m/,
    translate: () => ({
      title: "Every commit needs a message",
      explanation: 'The message describes what changed, so you (and others) can understand the history later. Put it in quotes after -m.',
      whereToLook: 'Try: git commit -m "Describe what you did"',
    }),
  },
];

export const TIMEOUT_ERROR_NAME = "TimeoutError";

export type ErrorLanguage = "javascript" | "sql" | "terminal";

export function translateError(err: ErrorInfo, language: ErrorLanguage = "javascript"): Translation {
  if (err.name === TIMEOUT_ERROR_NAME && language === "sql") {
    return {
      title: "Your query took too long and was stopped",
      explanation: "The database worked for several seconds without finishing, so Stack Quest stopped it. This can happen when a query joins tables without saying how they connect, which makes a huge number of rows.",
      whereToLook: "Check every JOIN has an ON condition, and that you aren't generating far more rows than you need.",
    };
  }
  if (err.name === TIMEOUT_ERROR_NAME) {
    return {
      title: "Your code took too long and was stopped",
      explanation:
        "The code ran for several seconds without finishing. Usually that means a loop never ends: its condition stays true forever. Stack Quest stopped it so your browser stays responsive.",
      whereToLook: "Check every loop (while, for): does something inside it change, so the condition eventually becomes false?",
    };
  }

  const rules = language === "sql" ? SQL_RULES : language === "terminal" ? TERMINAL_RULES : JS_RULES;
  for (const rule of rules) {
    const match = err.message.match(rule.pattern);
    if (match) return rule.translate(match, err);
  }

  return {
    title:
      language === "sql"
        ? "The database reported a problem"
        : language === "terminal"
          ? "The terminal reported a problem"
          : `JavaScript reported a ${err.name || "problem"}`,
    explanation:
      "This one isn't in the translator yet. Read the real message below slowly: it usually names the thing that went wrong.",
    whereToLook: `${at(err)}. Try searching the web for the exact message in quotes.`,
  };
}
