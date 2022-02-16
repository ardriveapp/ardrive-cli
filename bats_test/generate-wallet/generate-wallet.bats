#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "generate-wallet creates canonical wallet" {
    
    run -0 bash -c "yarn ardrive generate-wallet -s 'this is an example twelve word seed phrase that you could use' | jq .kty,.n,.e,.d,.p,.q,.dp,.dq,.qi,.kid"

    assert_line -n 0 '"RSA"'
    assert_line -n 1 '"jw8e2rH-iNRaLsoutq7UIVrcK0wxqQzG7wJ8ip0J6uNDXDKzFB9H0WwcHXYZyhE2faS73J47Tob5KtpTlBXt6lCOnl8Vp0Ud3Y025lDhxMevnSVkTBY8SIxSsAOwwUDPFIJE9W2f9ZZ4DZh5hWy7n0wYWi4APWiwD7tfvxX8xHUcOOvZRiTY-JOmN7pOnFvwzblX4Mpg1kON-b31VLxhyZKUYFhDuEXsxX8mHT_kpbUdHV24DMch44SbzNkRSYKJ3IqSW6fBZo5Zt9wzpFe7VhhRrfM8ZEOVYWdebLQfMc0lxt4zXQCHpmrUub8e13GGCB2kL3q38sR7XU_fa1PyiTsPtYjH0v4cdvkK58dfnTZDlhfSJjoyNYi_MVuhdtw5drECxxGJQItE6IdWvnKW8yAjJs0rAxQ8vVQhw9Ss6Kj4exM-szuKjcNpbbS_k8dK1j-CELPJ1bh2rThfc2NFCGvweTtn-oatJDObqymkqOV2939k8Xydeb0cC3CTt4QGnO5zW3yffupT3DorX0T2OhTDHjVWVmXE0e5hACpguHTIMLF418t5OcH981EG2d0sTDDrCBVTWyhmADZpvdTryj4r2c4YgaPw8YElyGCGkhw3txAfMPAUPxtbx3v3OBeFCpSpIjXdRqrDapaDd3CLSBgHy3OuNF4_YBXSBIBiNpU"'
    assert_line -n 2 '"AQAB"'
    assert_line -n 3 '"W9efPVOsT3fU9dkDKHEQ6uEEHB_sedUkGemEvxCWf1-rrRM3eKGkX8SCQD_DysBGNV9-4-IJvR5V9Lb5lUaG2TkidnYg1qQ-yi-QoUgnyUdRbRfGTjqwNPsxUqLr5QWQbGA9mTrpyKbzJ_dNfOUThu85axvBN6tv7ImkrG6XOiDdH4X6lVeum9dejMRlF2jHLavhyQTkKmpwSXc0e1P9i4U5EKlZwIHTwe8hLwIH7oJZ0LKMKFfnX8OQqnBo8sKFczrbP1Bxjz-wRaNu3AEe2eT--yf_C3d__Wp5alww8q37pLKeUwS2EZbgPud-C15sZ-VvtLOaSJbvhDZ0_tiECa2KLFfI-riMS-Un6GjHPjpzts24IYARr9HtdlC6Z8wNBAzTIOYB0uPZ-kZQc2ieu-OHchIMelXds82f2wJYrs1zVKcpf7UQsb5Df5pgAh0biOQX-sto-HlIjixC2HuyDhl9j2irwRwauBJcM0Wookvd4i0CzRFMBF9LelVGZ_W036Wir-63CnslHEDKvNVsuGjyKFDeKBpD2s_XARN41h-TsSPj3N6hLoOerxiPbDYttPpbnfJ6SfkF174mNSt9x6LRP67mZIFHy9Lik9TsB6Tw09qrbd56obJDKUinFQaee0ephM7wBRH_KapikcYZ9vNPcGAI1AktYHRYifuqwsE"'
    assert_line -n 4 '"8e4ylbMCNEz-p3Jc8j8exSty0MTpKQSJN8jv8QCVZgbyKogRPrxJBXz7P56WIwOsH_JghsfGeUJcsX-zyq-4xm5xwhT5ngd09Wr6Oj51Qjv4r8C2LCqFc4e7-Njt3hhgQLTQ2wMnBJVjbNStVLrpriL3dPm_d9-viPn3oqiJLdzS_TWmD7_1n0U9II2QaqhWjnEJ3DN_LkO5yju2w0IqwaRVfFTkpHv7EvS7D-Y83cAI3zBW-CkU6o04KEcdKP4SsmS0Rxuww4LuEp_f4XV84Z5mUo1m3umDeZccKRF03m7J2dQSRb58Nh0yOIWooIKDjCqVMuOoRejolVvkqcxraQ"'
    assert_line -n 5 '"l2DzDQq_q1t42GfYL9llcsxdoas4wg9vCQwcEY8S_8Np7L2hJC7JzjSuR37z1_cJN4oSxcgtMoGy_LwTgYb-kCEzFAM9xH_Oa_Pgg4xfYtdD4Yzc-S9oZh_N6p2sub3MWaXW2UMFnwHolkUW3T_a9V7wmtv3IchB2pHmoNosYG3H-uOZgECmbLs39LbBvub9CHPtEo2FTfG5bnNuQootziTvWZGD40fJEKxOB4c3xzPT_xwtF2t_Z1tD76C3E516y2eIDAG_fTa5Bq6obe7-d4bAtfr5pgcWuU9jB1mTxxpBz94gFWB3kn-fPzbqirJZWo2E0dB_WqNjt3WcfAGoTQ"'
    assert_line -n 6 '"kq-SDCIVXBCy9mPo5xhOV84YN2ys0inl6OT0VnO8IbhkbFVD333Z6HH3BIPrFB_N5TDYReAq_qq1-Qkswd_5cJbWco61KpPq3kKWpWnpPteN2UJHMlA1ye6qkh81Wkv9UD5Rw_kNV0Icnof08ELEHMkmsM4cwVnm3G5zLzRwuFYDt3Mn1LTXAFLC1VIAFisrEAKJr_GpUyvNIklCbvFXa0Fwc4old3WUrdGk-ebnUKx2tJxinuSJwg0N154GmCw0ueVFSTgI3QItxy0YWWMa7NFVyQfjL5T2Gmr8sAndimAyEtj6mz77oPPi11JzA58ek4XeIJTYGks1ehnVcv52wQ"'
    assert_line -n 7 '"B_WrEgZ8qY_3vLlJHsr5kJ26VqPgKiQRnJIsb6fsQdKOoUofTP3A0rzmZRAB1ltA-tChyBCMf9leBfgFtovYms-EFgtNliV6PyblqUUaRuI2yYdUny2k-am2dB2yVVnrgtM7htUFWKULC8u6NgwDgV9qm1nxlq8m900wqUiPiMp89248RgggOBtoB9AMQ_N1Xppp3s3eMokBTRN4urr1SZ-bjkQegTbnFZ9Zwv-TKUBKZ2Gd5VtbqZ2c5t62gauIJ2XcO3VkEjtsYzOP26fzbWmCfI8jzV0WDsxj0qEdKhzxVPLDERyvbN6VCwfiMUTLef1y_G1QJP3uYlkmz0ZvCQ"'
    assert_line -n 8 '"TgjJGFXrggHszRCRaccjeFJOHP22RMakqddAgImnMtStAFwOKdlNA1WND0xd4e1zVJso_IFRO9-kMrMv8JmLj-3QloS5-UFDlvfywfqHwPiyy3KVQtgGnm6PJ6WR2qbA2dcBgiGpM-lbC-t-mRa4YeNANmrTchr5RIlXNg4pVaFZUjG6-QDb4WL_CFmA5KgC70HFzaXFHvKFM2SYRo_lUytjINzsv6oayB6nFfhq0e1EyouyOY5cU5B57Lu9QSfMWdnbNdwW7pHNkZwOd9BqrRhBcO1JncHKsyr8bplWO1ffTftpMmSseDzaSd_Zi1n2h8dblu8jMh6pNAiWF46bBA"'
    assert_line -n 9 '"2011-04-29"'
}

@test "generate-wallet rejects short and long seed phrases" {
    
    run -1 bash -c "yarn ardrive generate-wallet -s 'invalid seed phrase'"

    assert_line -n 0 "Error: 'invalid seed phrase' is not a valid 12 word seed phrase!"
    
    run -1 bash -c "yarn ardrive generate-wallet -s 'this invalid seed phrase has thirteen words and is expected to be rejected'"

    assert_line -n 0 "Error: 'this invalid seed phrase has thirteen words and is expected to be rejected' is not a valid 12 word seed phrase!"
}
