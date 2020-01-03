// Description:
//   Notifies about Jenkins builds via Jenkins Notification Plugin for hubot-slack(v4)
//
// Dependencies:
//   hubot-slack: ^4.4.0
//
// Configuration:
//   HUBOT_JENKINS_COLOR_ABORTED: color for aborted builds
//   HUBOT_JENKINS_COLOR_FAILURE: color for failed builds
//   HUBOT_JENKINS_COLOR_FIXED: color for fixed builds
//   HUBOT_JENKINS_COLOR_STILL_FAILING: color for still failing builds
//   HUBOT_JENKINS_COLOR_SUCCESS: color for success builds
//   HUBOT_JENKINS_COLOR_DEFAULT: default color for builds
//
//   Just put this url
//   <HUBOT_URL>:<PORT>/<HUBOT_NAME>/jenkins?room=<room> to your
//   Jenkins Notification config. See here:
//   https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin
//
// Commands:
//   None
//
// Notes:
//   POST /<robot-name>/jenkins?room=<room>
//
// Author:
//   inkel

const HUBOT_JENKINS_COLOR_ABORTED       = process.env.HUBOT_JENKINS_COLOR_ABORTED       || "warning";
const HUBOT_JENKINS_COLOR_FAILURE       = process.env.HUBOT_JENKINS_COLOR_FAILURE       || "danger";
const HUBOT_JENKINS_COLOR_FIXED         = process.env.HUBOT_JENKINS_COLOR_FIXED         || "#d5f5dc";
const HUBOT_JENKINS_COLOR_STILL_FAILING = process.env.HUBOT_JENKINS_COLOR_STILL_FAILING || "danger";
const HUBOT_JENKINS_COLOR_SUCCESS       = process.env.HUBOT_JENKINS_COLOR_SUCCESS       || "good";
const HUBOT_JENKINS_COLOR_DEFAULT       = process.env.HUBOT_JENKINS_COLOR_DEFAULT       || "#ffe094";

module.exports = robot => robot.router.post(`/${robot.name}/jenkins`, function(req, res) {
  let color, status;
  const {
    room
  } = req.query;

  if (room == null) {
    res.status(400).send("Bad Request").end();
    return;
  }

  if (req.query.debug) {
    console.log(req.body);
  }

  const data = req.body;

  res.status(202).end();

  if (data.build.phase === "QUEUED") { return; }
  if (data.build.phase === "COMPLETED") { return; }

  const attachment =
    {fields: []};

  attachment.fields.push({
    title: "Phase",
    value: data.build.phase,
    short: true
  });

  switch (data.build.phase) {
    case "FINALIZED":
      status = `${data.build.phase} with ${data.build.status}`;

      attachment.fields.push({
        title: "Status",
        value: data.build.status,
        short: true
      });

      color = (() => { switch (data.build.status) {
        case "ABORTED":       return HUBOT_JENKINS_COLOR_ABORTED;
        case "FAILURE":       return HUBOT_JENKINS_COLOR_FAILURE;
        case "FIXED":         return HUBOT_JENKINS_COLOR_FIXED;
        case "STILL FAILING": return HUBOT_JENKINS_COLOR_STILL_FAILING;
        case "SUCCESS":       return HUBOT_JENKINS_COLOR_SUCCESS;
        default:                      return HUBOT_JENKINS_COLOR_DEFAULT;
      } })();
      break;

    case "STARTED":
      status = data.build.phase;
      color = "#e9f1ea";

      attachment.fields.push({
        title: "Build #",
        value: `<${data.build.full_url}|${data.build.number}>`,
        short: true
      });

      var params = data.build.parameters;

      if (params && params.ghprbPullId) {
        attachment.fields.push({
          title: "Source branch",
          value: params.ghprbSourceBranch,
          short: true
        });
        attachment.fields.push({
          title: "Target branch",
          value: params.ghprbTargetBranch,
          short: true
        });
        attachment.fields.push({
          title: "Pull request",
          value: `${params.ghprbPullId}: ${params.ghprbPullTitle}`,
          short: true
        });
        attachment.fields.push({
          title: "URL",
          value: params.ghprbPullLink,
          short: true
        });
      } else if (data.build.scm.commit) {
        attachment.fields.push({
          title: "Commit SHA1",
          value: data.build.scm.commit,
          short: true
        });
        attachment.fields.push({
          title: "Branch",
          value: data.build.scm.branch,
          short: true
        });
      }
      break;
  }

  attachment.color    = color;
  attachment.pretext  = `Jenkins ${data.name} ${status} ${data.build.full_url}`;
  attachment.fallback = attachment.pretext;

  if (req.query.debug) {
    console.log(attachment);
  }

  return robot.messageRoom(`#${room}`, {
    attachments: [ attachment ]
  });
});
