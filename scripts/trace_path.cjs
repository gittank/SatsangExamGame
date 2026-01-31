var data = require("../data/answer_matrix.json");
var treeData = require("../data/decision_tree.json");
var tree = treeData.tree;
var target = process.argv[2] || "bhagwan_swaminarayan";
var entityIdx = data.entities.indexOf(target);
if (entityIdx === -1) { console.log("Entity not found: " + target); process.exit(1); }
var answers = data.matrix[entityIdx];

function trace(node, path) {
  if (node == null || node.type === "entity") {
    path.push({ result: node ? node.entityId : "NULL" });
    return path;
  }
  if (node.type === "empty") {
    path.push({ result: "EMPTY" });
    return path;
  }
  var qIdx = node.questionId - 1; // questionId is 1-based
  var ans = answers[qIdx];
  var goYes = ans >= 0.5;
  path.push({
    questionText: node.questionText,
    questionId: qIdx,
    answerValue: ans,
    branch: goYes ? "YES" : "NO"
  });
  return trace(goYes ? node.yesChild : node.noChild, path);
}

var path = trace(tree, []);
path.forEach(function(step, i) {
  if (step.result !== undefined) {
    console.log("=> Result: " + step.result);
  } else {
    console.log((i+1) + ". " + step.questionText);
    console.log("   Answer: " + step.branch);
  }
});
