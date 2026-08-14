.1
PS C:\Users\desar\OneDrive\Desktop\jk\tesis\code\esp32> Get-ChildItem . -Filter *.ts -File -Recurse | ForEach-Object {                                                                                           
>>     "----- $($_.Name) -----"
>>     Get-Content $_.FullName 
>> } | Set-Content conext.txt