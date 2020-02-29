const siteUrl = "https://www.websitecarbon.com/website/vg-no/";
const axios = require("axios");
const cheerio = require("cheerio");

const fetchData = async function () {
      const result = await axios.get(siteUrl);
      return cheerio.load(result.data);
};

axios.get(siteUrl).then(res=>{
    let $ = cheerio.load(res.data);

    let a =$('.js-countup').data('count');
    console.log(a);

});
