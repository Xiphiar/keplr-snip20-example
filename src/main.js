const { SigningCosmWasmClient } = require("secretjs");
const chainId = "secret-2";


window.onload = async () => {
    // Keplr extension injects the offline signer that is compatible with secretJS.
    // You can get this offline signer from `window.getOfflineSigner(chainId:string)` after load event.
    // And it also injects the helper function to `window.keplr`.
    // If `window.getOfflineSigner` or `window.keplr` is null, Keplr extension may be not installed on browser.
    if (!window.getOfflineSigner || !window.keplr) {
        alert("Please install keplr extension");
    }

    // You should request Keplr to enable the wallet.
    // This method will ask the user whether or not to allow access if they haven't visited this website.
    // Also, it will request user to unlock the wallet if the wallet is locked.
    // If you don't request enabling before usage, there is no guarantee that other methods will work.
    await window.keplr.enable(chainId);

    const offlineSigner = window.getOfflineSigner(chainId);
	const enigmaUtils = window.getEnigmaUtils(chainId);

    // You can get the address/public keys by `getAccounts` method.
    // It can return the array of address/public key.
    // But, currently, Keplr extension manages only one address/public key pair.
    // XXX: This line is needed to set the sender address for SigningCosmosClient.
    // Save it to the window variable
    window.accounts = await offlineSigner.getAccounts();
	

    // Initialize the gaia api with the offline signer that is injected by Keplr extension.
    // Save it to the window variable
	window.secretJS = new SigningCosmWasmClient(
		"https://secret-lcd.azurefd.net",
		accounts[0].address,
		offlineSigner,
		enigmaUtils
	);

    document.getElementById("address").append(window.accounts[0].address);
};

document.sendForm.onsubmit = () => {
    let recipient = document.sendForm.recipient.value;
    let amount = document.sendForm.amount.value;

    amount = parseFloat(amount);
    if (isNaN(amount)) {
        alert("Invalid amount");
        return false;
    }

    amount *= 1000000;
    amount = Math.floor(amount);

    (async () => {
        const sSCRTaddress = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek";

        //get sSCRT viewing key from Keplr
        let sSCRTviewKey = await window.keplr.getSecret20ViewingKey(chainId, sSCRTaddress);

        //query sSCRT balance using view key
        const balanceQuery = { 
            balance: {
                key: sSCRTviewKey, 
                address: window.accounts[0].address
            }
        };
        let balance = await window.secretJS.queryContractSmart(sSCRTaddress, balanceQuery);
        balance = balance.balance.amount / 1000000;

        console.log('My token balance: ', balance);


        
        // Transfer some tokens
        // Amount must be a string
        let transferMsg = {
            transfer: 
            {
                recipient: recipient, amount: String(amount)
            }
        };
        console.log('Transferring tokens');
        response = await window.secretJS.execute(sSCRTaddress, transferMsg);
        console.log('Transfer response: ', response)

        balance = await window.secretJS.queryContractSmart(sSCRTaddress, balanceQuery);
        balance = balance.balance.amount / 1000000;
        console.log('New sSCRT balance', balance)

        if (response.code !== undefined &&
            response.code !== 0) {
            alert("Failed to send tx: " + response.log || response.rawLog);
        } else {
            alert("Succeed to send tx");
        }

    })();

    return false;
};
