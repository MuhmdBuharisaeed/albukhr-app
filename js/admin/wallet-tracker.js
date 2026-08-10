const ALBUKHR_WALLET =
"GCUL57JUBQNCF4YGEQFP33NZMWNCXWJMIVB66SJWHBW7AS6ZDQ4JL26V";

const HORIZON_URL =
"https://api.mainnet.minepi.com";

async function getWalletInfo(){

  const response = await fetch(
    `${HORIZON_URL}/accounts/${ALBUKHR_WALLET}`
  );

  if(!response.ok){
    throw new Error("Unable to load wallet");
  }

  return await response.json();

}

async function getWalletBalance(){

  const data = await getWalletInfo();

  const piBalance =
    data.balances.find(
      b => b.asset_type === "native"
    );

  return Number(
    piBalance?.balance || 0
  );

}
