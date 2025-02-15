export const getData = async (sheetId: string, sheetName: string) => {
  const response = await fetch(`https://opensheet.elk.sh/${sheetId}/${sheetName}`)
  const data = await response.json()
  return data
}

