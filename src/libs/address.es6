import externalIP from 'external-ip';
import Promise from 'bluebird';

let _address;

export default function address(server) {
  if (_address) {
    return _address;
  }

  _address = new Promise(resolve => {
    const defAddress = server.address();

    externalIP()((err, hostname) => {
      if (err) throw err;
      resolve({...defAddress, hostname, protocol: 'https'});
    });
  }).catch(err => {
    console.error(err);

    // serious failure
    process.exit(1);
  });

  return _address;
}
