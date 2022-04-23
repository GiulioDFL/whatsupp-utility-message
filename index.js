const args = require('minimist')(process.argv.slice(2));
const comunicazioni = eval(args.dati);
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

const esito = (numero, messaggio, esito) => {
    console.log({
        numero: numero,
        messaggio: messaggio,
        esito: esito
    });
}

const destroyClient = async (starter) => {
    console.log(`(${starter}) Shutting down...`);
    await client.destroy();
    process.exit(0);
}

client.on('ready', () => {
    console.log('Client ready');
    comunicazioni.forEach(comunicazione => {
        client.getNumberId(comunicazione[0]).then(detail => {
            client.sendMessage(detail._serialized, comunicazione[1]).then(msg => {
                comunicazione.push(msg._data.id.id);
            }).catch(error => {
                console.log(error);
                esito( comunicazione[0], comunicazione[1], 'Non inviato (Send error)' );
                comunicazione.push(null, null);
                tryTerminate();
            });
        }).catch(error => {
            esito( comunicazione[0], comunicazione[1], 'Non inviato (Invalid number)' );
            comunicazione.push(null, null);
            tryTerminate();
        });
    });
});

client.on('message_ack', async (msg, ack) => {
    comunicazioni.forEach(comunicazione => {
        if (comunicazione.length === 3) {
            if (comunicazione[2] === msg._data.id.id && msg._data.ack === 1) {
                esito(msg._data.to, msg._data.body, 'Inviato');
                comunicazione.push(msg._data.ack);
                tryTerminate();
            }
        }
    })
})

const tryTerminate = () => {
    let comunicati = 0;
    comunicazioni.forEach(comunicazione => {
        if (comunicazione[3] === 1 || comunicazione[3] === null) comunicati++;
        if (comunicati === comunicazioni.length) destroyClient('COMPLETED');
    })
}

process.on('SIGINT', async () => {
    destroyClient('SIGINT');
})

/*
client.on('message', message => {
    if (message.body === 'ciao') {
        message.reply('Ciao amore');
    }
})
*/

client.initialize();