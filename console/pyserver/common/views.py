from django.shortcuts import render


def Terms(request):
    return render(request, 'common/terms.html')


def Privacy(request):
    return render(request, 'common/privacy.html')


def NFT(request):
    return render(request, 'common/nft.html')


def Help(request):
    return render(request, 'common/help.html')
