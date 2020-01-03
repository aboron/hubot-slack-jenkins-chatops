// Description:
//   Jenkins CI Interactive bot
//
// Dependencies:
//   hubot-slack: ^4.4.0
//
// Configuration:
//   HUBOT_JENKINS_URL
//
//   URL should be in the "http://user:pass@localhost:8080" format.
//
// Commands:
//   hubot j(enkins) build - lists Jenkins jobs for build
//   hubot j(enkins) build <job name> - Build jenkins job
//
// Author:
//   subicura

const { createMessageAdapter } = require('@slack/interactive-messages');
const slackMessages = createMessageAdapter(process.env.HUBOT_SLACK_VERIFICATION_TOKEN);
const jenkins = require('jenkins')({ baseUrl: process.env.HUBOT_JENKINS_URL, crumbIssuer: true });

module.exports = function(robot) {
  robot.respond(/j(?:enkins)? build$/i, res => jenkins.job.list(function(err, data) {
    if (err) {
      res.send(`error: ${err.message}`);
      return;
    }

    const response = '';
    const jobs = [];

    for (let job of Array.from(data)) {
      const state = job.color === "red" ?
                "FAIL"
              : job.color === "aborted" ?
                "ABORTED"
              : job.color === "aborted_anime" ?
                "CURRENTLY RUNNING"
              : job.color === "red_anime" ?
                "CURRENTLY RUNNING"
              : job.color === "blue_anime" ?
                "CURRENTLY RUNNING"
              : "PASS";
      jobs.push({text: `${job.name} ${state}`, value: job.name});
    }

    const attachment = {
      "text": "Choose a job to build",
      "fallback": "You are unable to choose a job",
      "callback_id": "jenkins.job.build",
      "color": "#3AA3E3",
      "attachment_type": "default",
      "actions": [
        {
          "name": "jobs_list",
          "text": "Pick a job...",
          "type": "select",
          "options": jobs
        }
      ]
    };

    if (!jobs.length) {
      return res.send("no job exists.");
    } else {
      return res.send({
        text: "Jenkins job list",
        attachments: [ attachment ]});
    }}));

  robot.respond(/j(?:enkins)? build ([\w\.\-_ ]+)(, (.+))?/i, function(res) {
    const job = res.match[1];
    return jenkins.job.build(job, function(err, data) {
      if (err) {
        res.send(`error: ${err.message}`);
        return;
      }
      return res.send(`${job} job is started by ${res.message.user.name}`);
    });
  });

  // interactive action
  robot.router.use('/slack/action', slackMessages.expressMiddleware());

  return slackMessages.action('jenkins.job.build', function(payload, res) {
    const action = payload.actions[0];
    const select = action.selected_options[0];

    robot.logger.debug('handle welcome action with payload: ' + payload);

    jenkins.job.build(select.value, function(err, data) {
      if (err) {
        res({text: `error: ${err.message}`});
        return;
      }
      return res({text: `${select.value} job is started by ${payload.user.name}`});
    });

    return payload.original_message;
  });
};
