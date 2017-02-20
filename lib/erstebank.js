'use strict'

/**
 * Created by simon on 02.02.17.
 *
 * inspired by https://github.com/angelol/erste-bank-client (python client)
 */
var RSA = require('./rsa');
var Promise = require('bluebird');

var request = require('request');
var cookieJar = request.jar()
Promise.promisifyAll(request);

var ErsteBankClient = module.exports = function(config) {
    if (!(this instanceof ErsteBankClient)) {
        return new ErsteBankClient(config);
    }
    config = config ? config : {};
    this._username = config.username;
    this._password = config.password;
    this._iban = config.iban;
    this._account_id = config.account_id;
}

ErsteBankClient.prototype.access_token = function(modules, exponent, salt, password) {
    var self = this;

    const url =
        "https://login.sparkasse.at/sts/oauth/authorize?response_type=token&client_id=georgeclient";

    // let's get a session
    return request.getAsync({
            url: url,
            timeout: 1500,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
            },
            jar: cookieJar
        }
    )
    .then(function() {
        return request.postAsync({
                url: url,
                timeout: 1500,
                jar: cookieJar,
                headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                },
                form: {
                    'javaScript': 'jsOK'
                }
            }
        )
    })
    .then(function (response) {
        let salt = (response.body.match('var random = "(.*?)";'))[1];
        let modulus = (response.body.match('name="modulus" value="(.*)?"'))[1];
        let exponent = (response.body.match('exponent" value="(.*)?"'))[1];

        /*
        console.log("SALT",salt);
        console.log("modulus",modulus);
        console.log("exponent",exponent);
        */

        var rsa = RSA.newRSAKey();
        rsa.setPublic(modulus, exponent);

        return {
            encrypted: rsa.encrypt(salt + "\t" + self._password),
            salt: salt
        }
    })
    .then(function(rsa) {
        const url = 'https://login.sparkasse.at/sts/oauth/authorize?client_id=georgeclient&response_type=token';
        return request.postAsync({
                url: url,
                timeout: 1500,
                jar: cookieJar,
                followRedirect: false,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                },
                form: {
                    'rsaEncrypted': rsa.encrypted,
                    'saltCode': rsa.salt,
                    'j_username': self._username
                }
            }
        )
    })
    .then(function(tokenResponse) {
        if(!tokenResponse.headers['location']) {
            throw tokenResponse.body;
        }
        else if(tokenResponse.headers['location'].indexOf("access_token") == -1) {
            throw "invalid reponse for login: " + tokenResponse.headers['location'];
        }
        self._access_token = (tokenResponse.headers['location'].match('#access_token=(.*?)&'))[1];
        return self._access_token;
    })
};

ErsteBankClient.prototype.getAccountId = function() {
    var self = this;
    if(!self._account_id) {
        const url = 'https://api.sparkasse.at/proxy/g/api/my/accounts';
        return request.getAsync({
                url: url,
                timeout: 1500,
                jar: cookieJar,
                followRedirect: false,
                json: true,
                auth: {
                    'bearer': self._access_token
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                }
            }
        )
            .then(function(result) {
                result.body.collection.forEach(function(a) {
                    if(a.accountno && a.accountno.iban == self._iban) {
                        self._account_id = a.id;
                    }
                });
                if(!self._account_id) {
                    throw {success: false, availableAccounts: result.body.collection};
                }
                return self._account_id;
            })
    }
    return Promise.resolve(self._account_id);
}

function formatDate(d) {
    return d.getFullYear()+"-"+zeroPad(d.getMonth()+1,2)+"-"+zeroPad(d.getDate(),2)+"T"+zeroPad(d.getHours(),2)+":"+zeroPad(d.getMinutes(),2)+":00"
}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

ErsteBankClient.prototype.getDataExport = function(startDate, endDate) {
    if(!startDate || !endDate) {
        throw "no startDate or endDate";
    }

    var self = this;
    return self.getAccountId()
        .then(function(accountId) {
            const url = 'https://api.sparkasse.at/proxy/g/api/my/transactions/export.json?' +
                'from=' +  encodeURIComponent(formatDate(startDate)) + '&' +
                'to=' + encodeURIComponent(formatDate(endDate)) +'&' +
                'lang=de&' +
                'sort=BOOKING_DATE_ASC&'+
                'fields=booking,receiver,amount,currency,reference,referenceNumber,valuation';

            return request.postAsync({
                    url: url,
                    timeout: 30000,
                    jar: cookieJar,
                    followRedirect: false,
                    json: true,
                    auth: {
                        'bearer': self._access_token
                    },
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                    },
                    form: {
                        'access_token': self.access_token,
                        'id': accountId
                    }
                }
            )
                .then(function (result) {
                    return result.body;
                })
        })
}