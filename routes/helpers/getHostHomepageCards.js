const Participant = require(`../../models/participant`);
const Quest = require(`../../models/quest`);
const Host = require(`../../models/host`);
const Rating = require(`../../models/ratings`);
const Participation = require(`../../models/participation`);

const { handleErrorsFromDB, getQuestStatus } = require(`./helperFunctions`);

const sortQuestsByProximity = (quests, currTime, key, order) =>
  quests.sort((questA, questB) => {
    if (key === `startTime`) {
      return order === `asc` ? Math.abs(questA.startTime.getTime() - currTime) - Math.abs(questB.startTime.getTime() - currTime) : Math.abs(questB.startTime.getTime() - currTime) - Math.abs(questA.startTime.getTime() - currTime);
    } else {
      return order === `asc` ? Math.abs(questA.endTime.getTime() - currTime) - Math.abs(questB.endTime.getTime() - currTime) : Math.abs(questB.endTime.getTime() - currTime) - Math.abs(questA.endTime.getTime() - currTime);
    } 
  });

const groupArr = (arr, grpLen=4) => {
  const arrToReturn = [];
  for (let i = 0; i < arr.length; i += grpLen) {
    arrToReturn.push(arr.slice(i, i + grpLen));
  }
  return arrToReturn;
}

const parseQuests = (quests, hostData, currTime) => 
  new Promise(async (resolve, reject) => {
    try {
      
      const parsedQuests = quests.map(({ _id, questName, hostUser, nature, description, startTime, endTime, logoURL, status }, i) => 
        ({ questID: _id, questName, hostUser, nature, description, startTime, endTime, logoURL,
          startDate: startTime.toDateString(), endDate: endTime.toDateString(), status: getQuestStatus(startTime, endTime, currTime),
          organization: hostData.organization, rating: hostData.rating, questStatus: status
        })
      );
      // console.log(quests);
      resolve(parsedQuests);

    } catch (err) {

      reject(err);

    }
  })

const getHomeCards = (participantQuests, allQuests, currTime) => ({
    myQuests: groupArr(sortQuestsByProximity(participantQuests, currTime, `startTime`, `asc`).slice(0, 4)),
    popularQuests: groupArr(allQuests.sort((qA, qB) => qB.participantCount - qA.participantCount).slice(0, 4))
  });

const getMyQuestCards = (participantQuests, currTime) => ({
    allQuests: groupArr(participantQuests),
    liveQuests: groupArr(participantQuests.filter(quest => quest.status === `Live`)),
    upcomingQuests: groupArr(participantQuests.filter(quest => quest.status === `Upcoming`)),
    pastQuests: groupArr(participantQuests.filter(quest => quest.status === `Past`))
  });

const getAllQuestCards = (allQuests) => ({
  allQuests: groupArr(allQuests)
});

const getHostHomepageCards = async (username) => {

  try {
      const currTime = Date.now();

      const hostData = await Host.findOne({ username });

      const allQuests = await parseQuests(await Quest.find({ hostUser: username }).sort({ createdAt: 'desc' }).exec(), hostData, currTime);

      const acceptedQuests = allQuests.filter(quest => quest.questStatus === `accepted`);
      const pendingQuests = allQuests.filter(quest => quest.questStatus === `pending`);

      return [{
        all: groupArr(acceptedQuests),
        live: groupArr(acceptedQuests.filter(quest => quest.status === `Live`)),
        upcoming: groupArr(acceptedQuests.filter(quest => quest.status === `Upcoming`)),
        past: groupArr(acceptedQuests.filter(quest => quest.status === `Past`)),
        pending: groupArr(pendingQuests)
      }, undefined];
  }
  catch (err) {
    console.log(err);
    const errObjToReturn = handleErrorsFromDB(err);
    return [undefined, errObjToReturn];
  }
}

module.exports = { getHostHomepageCards };
