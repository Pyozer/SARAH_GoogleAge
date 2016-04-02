var ScribeSpeak;
var token;
var TIME_ELAPSED;
var FULL_RECO;
var PARTIAL_RECO;
var TIMEOUT_SEC = 10000;

exports.init = function () {
    info('[ GoogleAge ] is initializing ...');
}

exports.action = function(data, callback){
	
	ScribeSpeak = SARAH.ScribeSpeak;

	FULL_RECO = SARAH.context.scribe.FULL_RECO;
	PARTIAL_RECO = SARAH.context.scribe.PARTIAL_RECO;
	TIME_ELAPSED = SARAH.context.scribe.TIME_ELAPSED;

	SARAH.context.scribe.activePlugin('GoogleAge');

	var util = require('util');
	console.log("GoogleAge call log: " + util.inspect(data, { showHidden: true, depth: null }));

	SARAH.context.scribe.hook = function(event) {
		checkScribe(event, data.action, callback); 
	};
	
	token = setTimeout(function(){
		SARAH.context.scribe.hook("TIME_ELAPSED");
	}, TIMEOUT_SEC);

}

function checkScribe(event, action, callback) {

	if (event == FULL_RECO) {
		clearTimeout(token);
		SARAH.context.scribe.hook = undefined;
		// aurait-on trouvé ?
		decodeScribe(SARAH.context.scribe.lastReco, callback);

	} else if(event == TIME_ELAPSED) {
		// timeout !
		SARAH.context.scribe.hook = undefined;
		// aurait-on compris autre chose ?
		if (SARAH.context.scribe.lastPartialConfidence >= 0.7 && SARAH.context.scribe.compteurPartial > SARAH.context.scribe.compteur) {
			decodeScribe(SARAH.context.scribe.lastPartial, callback);
		} else {
			SARAH.context.scribe.activePlugin('Aucun (GoogleAge)');
			ScribeSpeak("Désolé je n'ai pas compris. Merci de réessayer.", true);
			return callback();
		}
		
	} else {
		// pas traité
	}
}

function decodeScribe(search, callback) {

	console.log ("Search: " + search);
	var rgxp = /(âge|age)( a| de)? (.+)/i;

	var match = search.match(rgxp);
	if (!match || match.length <= 1){
		SARAH.context.scribe.activePlugin('Aucun (GoogleAge)');
		ScribeSpeak("Désolé je n'ai pas compris.", true);
		return callback();
	}

	search = match[3];
	return agegoogle(search, callback);
}

function agegoogle(searchperson, callback) {
	search = "Quel age a " + searchperson;
	var url = "https://www.google.fr/search?q=" + encodeURI(search) + "&btnG=Rechercher&gbv=1";
	console.log('Url Request: ' + url);

	var request = require('request');
	var cheerio = require('cheerio');

	var options = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
		'Accept-Charset': 'utf-8'
	};
	
	request({ 'uri': url, 'headers': options }, function(error, response, html) {

    	if (error || response.statusCode != 200) {
    		ScribeSpeak("La requête vers Google a échoué. Erreur " + response.statusCode);
			callback();
			return;
	    }
        var $ = cheerio.load(html);

        var informations = $('.g #_vBb span._m3b').text().trim();

        if(informations == "") {
        	console.log("Impossible de récupérer les informations sur Google");
        	ScribeSpeak("Désolé, je n'ai pas réussi à récupérer d'informations");
			callback();
        } else {
        	console.log("Informations: " + informations);

        	var splitinfos = informations.replace('ans', '').split('(');
	        var age = splitinfos[0].trim();
	        var dates = splitinfos[1].replace(')', '').trim();
	        var person = $('.g #_vBb div._eGc').text().trim().replace('Âge', '').replace('age', '');

        	ScribeSpeak(person + " a " + age + " ans");
			callback();
        }
	    return;
    });
}