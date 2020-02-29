
const siteUrl = "https://www.websitecarbon.com/website/";
const axios = require("axios");
const cheerio = require("cheerio");
const faunadb = require('faunadb');
require('dotenv').config();

const q = faunadb.query;
const client = new faunadb.Client({
    secret: process.env.FAUNADB_SERVER_SECRET
});

exports.handler = (event, context, callback) => {
    let siteCheck = event.queryStringParameters.site;
    let siteUrlAppend = siteCheck.split('.').join('-');

    //check if available in fauna
    client.query(
        q.Get(q.Match(q.Index("domain"), siteCheck))
    ).then(response => {
        let data = response.data;
        let hoursSinceSave = (new Date() - new Date(data.lastUpdateDate))/(60*60*1000);
        console.log(hoursSinceSave);
        if(hoursSinceSave > 1){//more than one hour apart
            throw "Cache bust";
        }
        return callback(null, {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*'
            },
            body: JSON.stringify(data.data)
        })
    }).catch(error => {
        axios.get(`${siteUrl}${siteUrlAppend}`).then(res => {
            let $ = cheerio.load(res.data);

            let dirtierScore = $('.report-summary__heading').text().indexOf('dirtier') > -1;

            let score = $('.js-countup').data('count');
            if (dirtierScore) {
                score = 100 - score;
            }

            let dirtyStats = $('.container>script').html();
            dirtyStats = dirtyStats.split('=')[1].trim().replace(";", "")
            let stats = JSON.parse(dirtyStats.substr(0, dirtyStats.length - 7) + "}");

            let dataObject = { score, stats };
            

            let dbObject = {domain: siteCheck, lastUpdateDate: new Date().toISOString(), data:dataObject}
            
            client.query(
                q.Get(q.Match(q.Index("domain"), siteCheck))).then(res =>{
                    return client.query(q.Update(res.ref, {data:dbObject}))
                }).catch(err=>{
                    client.query(q.Create(q.Collection('carboncache'), {data:dbObject}))
                });
           return callback(null, {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*'
                },
                body: JSON.stringify(dataObject)
            });

 
        });
    });






}
