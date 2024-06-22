let channelIds = [];

function addChannelId(object) {
    return channelIds.push(object);
}

function getChannelIds() {
    return channelIds;
}

function removeFromGeneratedId(generatedId) {
    channelIds = channelIds.filter((el) => el.generatedId != generatedId);
}

function nextGeneratedId() {
    if (channelIds.length == 0) {   return 0;   }
    const sorted = channelIds.map((o) => {return o.generatedId;}).sort((a, b) => {return a.generatedId - b.generatedId});
    return sorted[sorted.length-1] + 1;
}

module.exports = {addChannelId, removeFromGeneratedId, getChannelIds, nextGeneratedId};