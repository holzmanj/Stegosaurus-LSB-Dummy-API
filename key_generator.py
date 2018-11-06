from hashlib import sha256
import sys

def generate_keys(passwd):
    prelim_hash = sha256(passwd.encode()).hexdigest()
    #print("prelim_hash:\n%s ==> %s" % (passwd, prelim_hash))
 
    client_key_input = passwd + prelim_hash[32:]
    client_key = sha256(client_key_input.encode()).hexdigest()
    #print("client_key:\n%s ==> %s" % (client_key_input, client_key))

    server_key_input = passwd + prelim_hash[:32]
    server_key = sha256(server_key_input.encode()).hexdigest()
    #print("server_key:\n%s ==> %s" % (server_key_input, server_key))

    output_dict = {
        "prelim": prelim_hash,
        "client_input": client_key_input,
        "client_key": client_key,
        "server_input": server_key_input,
        "server_key": server_key
    }

    return output_dict

