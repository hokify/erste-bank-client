# erste-bank-client node js client

Based on https://github.com/angelol/erste-bank-client.

This client is a node-js version of it.

``npm install erstebankclient``

How to use:
```
var ErsteBankClient = require('erstebankclient');`

var from = new Date();
startDate.setDate(startDate.getDay()-10);
var to = new Date();
var ebc = new ErsteBankClient({
    username: '',
    password: '',
    iban: 'AT6...',
    account_id: '' // provide to save one additional call 
});
ebc.getDataExport(from, to) 
.then(function(result) {
       console.log(result);
})
```
