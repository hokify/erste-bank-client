# erste-bank-client node js client


A node-js module for erste bank to retrieve transactions. It's based on the python version of https://github.com/angelol/erste-bank-client. Uses "George"'s API to retrieve data.

``npm install erste-bank-client``

How to use:
```
var ErsteBankClient = require('erste-bank-client');`

var from = new Date();
from.setDate(from.getDay()-10);
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
