const  whois = require('node-whois');

let threadCount = 1;

process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err);
});

module.exports = function(len, tld){
	const sdf = {
		_len: undefined,
		_tld: undefined,

		_init: function(len, tld){
			sdf._len = len;
			sdf._tld = tld;

			return sdf;
		},

		_generateList: function(){
			let charset = 'abcdefghijklmnopqrstuvwxyz';

			charset = charset.split("");

			let results = [];

			const recur = function(strings, count){
				if(count == sdf._len){
					strings.forEach(function(string){
						results.push(string);
					});

					return;
				} else {
					strings.map(function(string){
						strings = charset.map(function(chr){
							return string + chr;
						});

						recur(strings, count + 1);
					});
				}
			}

			recur(charset, 1);

			return results;
		},

		_lookup: function(domain){
			return new Promise(function(resolve, reject){
				try {
					whois.lookup(domain, function(err, data) {
						if(err){
							reject(err);
						} else {
							resolve(data);
						}
					});
				} catch(e) {
					sdf._lookup(domain).then(function(result){
						resolve(result);
					}).catch(function(error){
						reject(error);
					});
				}
			});
		},

		find: function(){
			let list = sdf._generateList();

			const recur = function(list){
				//console.log(list.length + " left to go. ");
				setTimeout(function(){
					if(list.length > 0){
						let currentList = list.splice(0, threadCount);

						let currentListPromises = currentList.map(function(domain){
							return sdf._lookup(domain + "." + sdf._tld);
						});

						Promise.all(currentListPromises).then(function(results){
							results.forEach(function(result, index){
								if(result.indexOf("ERROR:103: ") !== -1){
									console.log(currentList[index] + "." + sdf._tld);
								}
							});

							recur(list);
						}).catch(function(results){
							console.log("Got blocked, retry in 10s.");
							setTimeout(function(){
								currentList.forEach(function(element){
									list.push(element);
								})

								recur(list);
							}, 10000)
						});
					} else {
						console.log("Done!");
						return;
					}
				}, 0);
			}

			recur(list);
		}
	}

	return sdf._init(len, tld);
};

